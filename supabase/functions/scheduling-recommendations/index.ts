/**
 * Scheduling Recommendations Edge Function
 *
 * Reads behavioral_signatures for a user, extracts work rhythm metrics,
 * calls Together.ai LLM to generate structured scheduling recommendations,
 * and upserts into scheduling_recommendations table.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY') || '';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const MODEL = 'moonshotai/Kimi-K2-Instruct';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch behavioral signatures (7-day and 30-day windows)
    const { data: signatures, error: sigError } = await supabase
      .from('behavioral_signatures')
      .select('category, metric_name, current_value, trend, window_days')
      .eq('user_id', user_id)
      .in('window_days', [7, 30])
      .order('computed_at', { ascending: false });

    if (sigError) {
      console.error('[scheduling] Error fetching signatures:', sigError);
      return new Response(JSON.stringify({ error: 'Failed to fetch signatures' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!signatures || signatures.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        recommendations: null,
        message: 'No behavioral signatures found. Connect the desktop app to start tracking.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract key metrics
    const metrics: Record<string, any> = {};
    for (const sig of signatures) {
      const key = `${sig.category}.${sig.metric_name}`;
      if (!metrics[key]) {
        metrics[key] = { value: sig.current_value, trend: sig.trend, window: sig.window_days };
      }
    }

    // Build a structured summary for the LLM
    const signatureSummary = signatures.map((s: any) => {
      const val = typeof s.current_value === 'object' ? JSON.stringify(s.current_value) : s.current_value;
      return `- ${s.category}/${s.metric_name}: ${val} (trend: ${s.trend || 'stable'}, ${s.window_days}d window)`;
    }).join('\n');

    // Call Together.ai for scheduling recommendations
    const prompt = `You are a productivity and scheduling advisor. Based on the user's behavioral data from their desktop activity tracking, generate personalized scheduling recommendations.

## User's Behavioral Signatures
${signatureSummary}

## Instructions
Analyze the behavioral patterns and generate scheduling recommendations. Return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "deep_work_blocks": [
    {"start_hour": 9, "end_hour": 11, "label": "Morning Deep Work", "reason": "Peak focus detected 9-11am"}
  ],
  "meeting_windows": [
    {"start_hour": 14, "end_hour": 16, "label": "Afternoon Meetings", "reason": "Lower focus scores, good for collaborative work"}
  ],
  "break_reminders": [
    {"after_minutes": 90, "duration_minutes": 10, "activity": "Walk or stretch", "reason": "Breaks every 90min match your natural rhythm"}
  ],
  "warnings": [
    {"type": "burnout_risk", "severity": "medium", "message": "Working past 7pm 3+ days/week", "recommendation": "Set a hard stop at 6:30pm"}
  ],
  "productivity_tips": [
    {"tip": "Your most productive hours are 9-11am — protect this time from meetings", "category": "time_blocking"},
    {"tip": "Context switching spikes after lunch — batch similar tasks together", "category": "batching"}
  ]
}

Rules:
- Use 24-hour format for hours (0-23)
- Base all recommendations on actual data patterns, not generic advice
- Include at most 3 deep_work_blocks, 2 meeting_windows, 3 break_reminders, 2 warnings, 4 tips
- If overtime or weekend patterns are detected, include a burnout warning
- Be specific about times and durations based on the data`;

    const llmResponse = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('[scheduling] LLM error:', errText);
      return new Response(JSON.stringify({ error: 'LLM call failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (strip any markdown fences)
    let recommendations: any;
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      recommendations = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[scheduling] Failed to parse LLM response:', rawContent);
      // Return a basic fallback structure
      recommendations = {
        deep_work_blocks: [],
        meeting_windows: [],
        break_reminders: [{ after_minutes: 90, duration_minutes: 10, activity: 'Short break', reason: 'Regular breaks improve focus' }],
        warnings: [],
        productivity_tips: [{ tip: 'Keep tracking your activity — more data means better recommendations', category: 'general' }],
      };
    }

    // Upsert into scheduling_recommendations
    const { error: upsertError } = await supabase
      .from('scheduling_recommendations')
      .upsert({
        user_id,
        recommendations,
        based_on_signatures: { signature_count: signatures.length, metrics_keys: Object.keys(metrics) },
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[scheduling] Upsert error:', upsertError);
    }

    return new Response(JSON.stringify({
      success: true,
      recommendations,
      generated_at: new Date().toISOString(),
      signature_count: signatures.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[scheduling] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
