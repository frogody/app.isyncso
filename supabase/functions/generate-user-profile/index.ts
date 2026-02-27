/**
 * Generate User Profile Edge Function
 *
 * Gathers data from multiple sources (sessions, entities, memory, activity, journals)
 * and uses an LLM to generate a comprehensive user profile biography with assumptions.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength) + '...';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, companyId } = await req.json();

    // Extract userId from auth header if not provided
    let effectiveUserId = userId;
    let effectiveCompanyId = companyId;

    if (!effectiveUserId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const payload = JSON.parse(atob(token.split('.')[1]));
          effectiveUserId = payload.sub;
        } catch {
          // ignore parse errors
        }
      }
    }

    if (!effectiveUserId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-user-profile] Generating profile for user ${effectiveUserId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gather ALL data sources in parallel
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      userResult,
      sessionsResult,
      entitiesResult,
      memoryResult,
      templatesResult,
      activityResult,
      journalsResult,
      rejectionsResult,
    ] = await Promise.all([
      // User data
      supabase
        .from('users')
        .select('name, email, company_id')
        .eq('id', effectiveUserId)
        .single(),

      // Last 10 sync sessions
      supabase
        .from('sync_sessions')
        .select('conversation_summary, active_entities, context')
        .eq('user_id', effectiveUserId)
        .order('updated_at', { ascending: false })
        .limit(10),

      // Top 20 sync entities
      supabase
        .from('sync_entities')
        .select('name, entity_type, metadata, interaction_count')
        .eq('user_id', effectiveUserId)
        .order('interaction_count', { ascending: false })
        .limit(20),

      // Top 10 memory chunks
      supabase
        .from('sync_memory_chunks')
        .select('content, chunk_type, importance_score')
        .eq('user_id', effectiveUserId)
        .order('importance_score', { ascending: false })
        .limit(10),

      // Top 10 action templates
      supabase
        .from('sync_action_templates')
        .select('action_type, intent_description, example_request')
        .eq('user_id', effectiveUserId)
        .order('use_count', { ascending: false })
        .limit(10),

      // Desktop activity logs summary (last 30 days)
      supabase
        .from('desktop_activity_logs')
        .select('app_name, semantic_category, total_minutes')
        .eq('user_id', effectiveUserId)
        .gte('hour_start', thirtyDaysAgo)
        .limit(100),

      // Last 7 daily journals
      supabase
        .from('daily_journals')
        .select('journal_date, content, highlights, productivity_score')
        .eq('user_id', effectiveUserId)
        .order('journal_date', { ascending: false })
        .limit(7),

      // Existing rejected assumptions (corrections)
      supabase
        .from('user_profile_assumptions')
        .select('category, assumption, user_feedback')
        .eq('user_id', effectiveUserId)
        .eq('status', 'rejected'),
    ]);

    // Extract data, continuing even if some sources fail
    const userData = userResult.data;
    const sessions = sessionsResult.data || [];
    const entities = entitiesResult.data || [];
    const memoryChunks = memoryResult.data || [];
    const actionTemplates = templatesResult.data || [];
    const activityLogs = activityResult.data || [];
    const journals = journalsResult.data || [];
    const rejections = rejectionsResult.data || [];

    if (!effectiveCompanyId && userData?.company_id) {
      effectiveCompanyId = userData.company_id;
    }

    // Log data availability
    console.log(`[generate-user-profile] Data gathered: user=${!!userData}, sessions=${sessions.length}, entities=${entities.length}, memory=${memoryChunks.length}, templates=${actionTemplates.length}, activity=${activityLogs.length}, journals=${journals.length}, rejections=${rejections.length}`);

    // Build user data string for LLM prompt
    let userDataStr = '';

    if (userData) {
      userDataStr += `Name: ${userData.name || 'Unknown'}\nEmail: ${userData.email || 'Unknown'}\n\n`;
    }

    if (sessions.length > 0) {
      userDataStr += 'RECENT CONVERSATIONS:\n';
      for (const s of sessions) {
        if (s.conversation_summary) {
          userDataStr += `- ${truncateText(s.conversation_summary, 200)}\n`;
        }
        if (s.active_entities && typeof s.active_entities === 'object') {
          const entityNames = Object.values(s.active_entities).flat().slice(0, 5);
          if (entityNames.length > 0) {
            userDataStr += `  Entities mentioned: ${entityNames.join(', ')}\n`;
          }
        }
      }
      userDataStr += '\n';
    }

    if (entities.length > 0) {
      userDataStr += 'TOP ENTITIES (people, companies, products the user interacts with most):\n';
      for (const e of entities) {
        userDataStr += `- ${e.name} (${e.entity_type}, ${e.interaction_count} interactions)\n`;
      }
      userDataStr += '\n';
    }

    if (memoryChunks.length > 0) {
      userDataStr += 'KEY MEMORY INSIGHTS:\n';
      for (const m of memoryChunks) {
        userDataStr += `- [${m.chunk_type}] ${truncateText(m.content, 200)}\n`;
      }
      userDataStr += '\n';
    }

    if (actionTemplates.length > 0) {
      userDataStr += 'FREQUENT ACTIONS:\n';
      for (const t of actionTemplates) {
        userDataStr += `- ${t.action_type}: ${t.intent_description || t.example_request || ''}\n`;
      }
      userDataStr += '\n';
    }

    if (activityLogs.length > 0) {
      // Aggregate activity by app
      const appMap = new Map<string, { minutes: number; category: string }>();
      for (const log of activityLogs) {
        const key = log.app_name || 'Unknown';
        const existing = appMap.get(key);
        if (existing) {
          existing.minutes += log.total_minutes || 0;
        } else {
          appMap.set(key, { minutes: log.total_minutes || 0, category: log.semantic_category || 'Other' });
        }
      }
      const sorted = Array.from(appMap.entries())
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 15);

      userDataStr += 'DESKTOP ACTIVITY (last 30 days):\n';
      for (const [app, data] of sorted) {
        const hours = Math.round(data.minutes / 60 * 10) / 10;
        userDataStr += `- ${app} (${data.category}): ${hours}h total\n`;
      }
      userDataStr += '\n';
    }

    if (journals.length > 0) {
      userDataStr += 'RECENT DAILY JOURNALS:\n';
      for (const j of journals) {
        userDataStr += `- ${j.journal_date}: productivity ${Math.round((j.productivity_score || 0) * 100)}%`;
        if (j.highlights && Array.isArray(j.highlights)) {
          const highlightTexts = j.highlights.slice(0, 3).map((h: any) =>
            typeof h === 'string' ? h : h.description || ''
          ).filter(Boolean);
          if (highlightTexts.length > 0) {
            userDataStr += ` — ${highlightTexts.join('; ')}`;
          }
        }
        if (j.content) {
          userDataStr += `\n  ${truncateText(j.content, 150)}`;
        }
        userDataStr += '\n';
      }
      userDataStr += '\n';
    }

    // Truncate total data to keep under 12000 chars
    if (userDataStr.length > 12000) {
      userDataStr = userDataStr.slice(0, 12000) + '\n...(truncated)';
    }

    // Build corrections string from rejected assumptions
    let correctionsStr = 'None';
    if (rejections.length > 0) {
      correctionsStr = rejections.map(r =>
        `- [${r.category}] "${r.assumption}" — User feedback: ${r.user_feedback || 'rejected'}`
      ).join('\n');
    }

    // Build LLM prompt
    const systemPrompt = `You are building a personal profile biography for a user of iSyncSO, an AI-powered business platform.

Based on the following data about the user, generate a comprehensive profile in JSON format:

{
  "biography": "A warm, insightful biography (2-3 paragraphs) written in third person. Reference specific details from their work patterns, interests, and interactions.",
  "tagline": "A single catchy sentence summarizing this person (e.g. 'Product-focused founder who lives in spreadsheets and dreams in APIs')",
  "work_style": ["trait1", "trait2", ...],
  "interests": ["interest1", "interest2", ...],
  "skills": ["skill1", "skill2", ...],
  "top_coworkers": [{"name": "...", "interaction_count": 0, "context": "..."}],
  "top_apps": [{"name": "...", "avg_daily_minutes": 0, "category": "..."}],
  "top_clients": [{"name": "...", "interaction_count": 0}],
  "assumptions": [
    {
      "category": "work_style|preference|skill|interest|personality|habit",
      "assumption": "A specific statement about the user",
      "confidence": 0.0,
      "evidence": "What data supports this assumption",
      "source": "conversation|activity|entity|journal"
    }
  ]
}

Generate 10-20 assumptions. Be specific and insightful, not generic. Base everything on actual data provided.

IMPORTANT: If the user has corrected previous assumptions (listed below as CORRECTIONS), respect those corrections and do NOT repeat the same wrong assumptions.

Respond ONLY with valid JSON, no additional text.`;

    const userPrompt = `CORRECTIONS FROM USER:
${correctionsStr}

USER DATA:
${userDataStr}`;

    if (!TOGETHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'TOGETHER_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-user-profile] Calling Together.ai for profile generation');

    const llmResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('[generate-user-profile] Together.ai error:', llmResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'LLM call failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const llmResult = await llmResponse.json();
    const content = llmResult.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[generate-user-profile] No content in LLM response');
      return new Response(
        JSON.stringify({ error: 'No content in LLM response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError: any) {
      console.error('[generate-user-profile] JSON parse error:', parseError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to parse LLM response as JSON', raw: content.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-user-profile] LLM response parsed successfully');

    // Extract profile data
    const biography = parsed.biography || '';
    const tagline = parsed.tagline || '';
    const workStyle = Array.isArray(parsed.work_style) ? parsed.work_style : [];
    const interests = Array.isArray(parsed.interests) ? parsed.interests : [];
    const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    const topCoworkers = Array.isArray(parsed.top_coworkers) ? parsed.top_coworkers : [];
    const topApps = Array.isArray(parsed.top_apps) ? parsed.top_apps : [];
    const topClients = Array.isArray(parsed.top_clients) ? parsed.top_clients : [];
    const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];

    // Track data source counts
    const dataSources: Record<string, number> = {
      sessions: sessions.length,
      entities: entities.length,
      memory_chunks: memoryChunks.length,
      action_templates: actionTemplates.length,
      activity_logs: activityLogs.length,
      activity_days: new Set(activityLogs.map(l => l.hour_start?.split('T')[0]).filter(Boolean)).size,
      journals: journals.length,
    };

    // Upsert into user_profile_biography
    const { data: profileData, error: profileError } = await supabase
      .from('user_profile_biography')
      .upsert({
        user_id: effectiveUserId,
        company_id: effectiveCompanyId || null,
        biography,
        tagline,
        work_style: workStyle,
        interests,
        skills,
        top_coworkers: topCoworkers,
        top_apps: topApps,
        top_clients: topClients,
        data_sources_used: dataSources,
        generation_model: 'moonshotai/Kimi-K2-Instruct',
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (profileError) {
      console.error('[generate-user-profile] Error upserting biography:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to save biography', details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete old active assumptions and insert new ones
    const { error: deleteError } = await supabase
      .from('user_profile_assumptions')
      .delete()
      .eq('user_id', effectiveUserId)
      .eq('status', 'active');

    if (deleteError) {
      console.error('[generate-user-profile] Error deleting old assumptions:', deleteError);
      // Continue anyway — profile was saved
    }

    if (assumptions.length > 0) {
      const assumptionRows = assumptions.map((a: any) => ({
        user_id: effectiveUserId,
        company_id: effectiveCompanyId || null,
        category: a.category || 'general',
        assumption: a.assumption || '',
        confidence: typeof a.confidence === 'number' ? a.confidence : 0.5,
        evidence: a.evidence || null,
        source: a.source || null,
        status: 'active',
      }));

      const { error: insertError } = await supabase
        .from('user_profile_assumptions')
        .insert(assumptionRows);

      if (insertError) {
        console.error('[generate-user-profile] Error inserting assumptions:', insertError);
        // Continue anyway — profile was saved
      }
    }

    console.log(`[generate-user-profile] Profile generated successfully with ${assumptions.length} assumptions`);

    return new Response(
      JSON.stringify({
        success: true,
        profile: profileData,
        assumptions_count: assumptions.length,
        data_sources: dataSources,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-user-profile] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
