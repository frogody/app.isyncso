/**
 * SYNC Learn Preferences Edge Function
 *
 * Reads recent feedback entries for a user, analyzes patterns,
 * and derives learned preferences (response length, formality,
 * module affinity, etc.) with confidence scores.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Fetch last 100 feedback entries
    const { data: feedback, error: fbError } = await supabase
      .from('sync_response_feedback')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fbError) {
      console.error('[learn] Error fetching feedback:', fbError);
      return new Response(JSON.stringify({ error: 'Failed to fetch feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!feedback || feedback.length < 5) {
      return new Response(JSON.stringify({
        success: true,
        preferences: [],
        message: `Need at least 5 feedback entries to derive preferences (have ${feedback?.length || 0}).`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalEntries = feedback.length;
    const preferences: Array<{ type: string; value: any; confidence: number; sample_count: number }> = [];

    // --- Derive: response_length ---
    const thumbsDown = feedback.filter((f: any) => f.feedback_type === 'thumbs_down');
    const thumbsUp = feedback.filter((f: any) => f.feedback_type === 'thumbs_up');
    const thumbsDownOnLong = thumbsDown.filter((f: any) => {
      const len = f.response_content?.length || 0;
      return len > 500;
    });
    const thumbsDownRate = totalEntries > 0 ? thumbsDown.length / totalEntries : 0;
    const longResponseDislikeRate = thumbsDown.length > 0 ? thumbsDownOnLong.length / thumbsDown.length : 0;

    if (thumbsDownRate > 0.3 && longResponseDislikeRate > 0.5) {
      preferences.push({
        type: 'response_length',
        value: { preferred: 'concise', max_sentences: 3 },
        confidence: Math.min(0.9, 0.5 + (thumbsDownRate * 0.4)),
        sample_count: thumbsDown.length,
      });
    } else if (thumbsUp.length > 5) {
      const avgUpLen = thumbsUp.reduce((sum: number, f: any) => sum + (f.response_content?.length || 0), 0) / thumbsUp.length;
      if (avgUpLen > 800) {
        preferences.push({
          type: 'response_length',
          value: { preferred: 'detailed', min_sentences: 4 },
          confidence: Math.min(0.8, 0.4 + (thumbsUp.length / totalEntries) * 0.4),
          sample_count: thumbsUp.length,
        });
      }
    }

    // --- Derive: module_affinity ---
    const actionCounts: Record<string, number> = {};
    for (const f of feedback) {
      if (f.action_type) {
        const module = f.action_type.split('_')[0]; // e.g., 'create_invoice' -> 'create'
        // Better: extract module from action patterns
        let mod = 'general';
        const at = f.action_type.toLowerCase();
        if (at.includes('invoice') || at.includes('expense') || at.includes('proposal') || at.includes('financial')) mod = 'finance';
        else if (at.includes('prospect') || at.includes('pipeline') || at.includes('campaign') || at.includes('crm')) mod = 'growth';
        else if (at.includes('product') || at.includes('inventory') || at.includes('stock')) mod = 'products';
        else if (at.includes('task') || at.includes('assign') || at.includes('complete')) mod = 'tasks';
        else if (at.includes('image') || at.includes('generate')) mod = 'create';
        else if (at.includes('team') || at.includes('member') || at.includes('invite')) mod = 'team';
        else if (at.includes('search') || at.includes('research')) mod = 'research';

        actionCounts[mod] = (actionCounts[mod] || 0) + 1;
      }
    }

    const sortedModules = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
    if (sortedModules.length > 0) {
      const totalActions = sortedModules.reduce((sum, [, count]) => sum + count, 0);
      const topModules = sortedModules.slice(0, 3).map(([mod, count]) => ({
        module: mod,
        usage_pct: Math.round((count / totalActions) * 100),
      }));

      preferences.push({
        type: 'module_affinity',
        value: { top_modules: topModules, primary: topModules[0]?.module },
        confidence: Math.min(0.85, 0.4 + (totalActions / 50) * 0.3),
        sample_count: totalActions,
      });
    }

    // --- Derive: formality ---
    const editedEntries = feedback.filter((f: any) => f.feedback_type === 'edited_before_send');
    if (editedEntries.length >= 3) {
      // If user frequently edits responses, they likely prefer a different style
      const editRate = editedEntries.length / totalEntries;
      preferences.push({
        type: 'formality',
        value: {
          preferred: editRate > 0.3 ? 'more_formal' : 'current_is_fine',
          edit_rate: Math.round(editRate * 100),
        },
        confidence: Math.min(0.7, 0.3 + editRate),
        sample_count: editedEntries.length,
      });
    }

    // --- Derive: proactivity ---
    const usedActionEntries = feedback.filter((f: any) => f.feedback_type === 'used_action');
    if (usedActionEntries.length >= 3) {
      const actionRate = usedActionEntries.length / totalEntries;
      preferences.push({
        type: 'proactivity',
        value: {
          preferred: actionRate > 0.4 ? 'high' : actionRate > 0.2 ? 'medium' : 'low',
          action_acceptance_rate: Math.round(actionRate * 100),
        },
        confidence: Math.min(0.8, 0.3 + actionRate * 0.5),
        sample_count: usedActionEntries.length,
      });
    }

    // --- Derive: detail_level ---
    const copiedEntries = feedback.filter((f: any) => f.feedback_type === 'copied');
    if (copiedEntries.length >= 2) {
      const avgCopiedLen = copiedEntries.reduce((sum: number, f: any) =>
        sum + (f.response_content?.length || 0), 0) / copiedEntries.length;
      preferences.push({
        type: 'detail_level',
        value: {
          preferred: avgCopiedLen > 600 ? 'detailed' : avgCopiedLen > 300 ? 'moderate' : 'brief',
          avg_preferred_length: Math.round(avgCopiedLen),
        },
        confidence: Math.min(0.75, 0.3 + (copiedEntries.length / totalEntries) * 0.4),
        sample_count: copiedEntries.length,
      });
    }

    // Upsert all preferences
    const upsertPromises = preferences.map((pref) =>
      supabase
        .from('sync_learned_preferences')
        .upsert({
          user_id,
          preference_type: pref.type,
          preference_value: pref.value,
          confidence: pref.confidence,
          sample_count: pref.sample_count,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,preference_type' })
    );

    const results = await Promise.all(upsertPromises);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('[learn] Upsert errors:', errors.map((e) => e.error));
    }

    return new Response(JSON.stringify({
      success: true,
      preferences_derived: preferences.length,
      preferences: preferences.map((p) => ({
        type: p.type,
        value: p.value,
        confidence: p.confidence,
        sample_count: p.sample_count,
      })),
      total_feedback_analyzed: totalEntries,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[learn] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
