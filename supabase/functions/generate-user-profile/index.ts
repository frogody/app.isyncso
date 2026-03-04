/**
 * Generate User Profile Edge Function — Accumulative System
 *
 * Each generation EVOLVES the profile rather than replacing it.
 * Confirmed knowledge persists forever. New data incrementally enriches.
 * Supports batch mode for weekly auto-generation via pg_cron.
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
    const body = await req.json();
    const { userId, companyId, batch } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Batch mode: process all users ──────────────────────────────
    if (batch) {
      console.log('[generate-user-profile] Batch mode — processing all eligible users');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Find users with profiles older than 7 days or no profile at all
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, company_id');

      if (!allUsers || allUsers.length === 0) {
        return new Response(JSON.stringify({ batch: true, processed: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let processed = 0;
      for (const u of allUsers) {
        // Check if profile was generated recently
        const { data: existing } = await supabase
          .from('user_profile_biography')
          .select('last_generated_at')
          .eq('user_id', u.id)
          .maybeSingle();

        if (existing?.last_generated_at && existing.last_generated_at > sevenDaysAgo) {
          continue; // Skip — generated within 7 days
        }

        try {
          await generateProfileForUser(supabase, u.id, u.company_id);
          processed++;
          console.log(`[generate-user-profile] Batch: processed user ${u.id}`);
        } catch (err) {
          console.warn(`[generate-user-profile] Batch: failed for user ${u.id}:`, (err as Error).message);
        }
      }

      return new Response(JSON.stringify({ batch: true, processed, total: allUsers.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Single user mode ───────────────────────────────────────────
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
          // ignore
        }
      }
    }

    if (!effectiveUserId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await generateProfileForUser(supabase, effectiveUserId, effectiveCompanyId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[generate-user-profile] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Core profile generation for a single user
// ═══════════════════════════════════════════════════════════════════════

async function generateProfileForUser(
  supabase: ReturnType<typeof createClient>,
  effectiveUserId: string,
  effectiveCompanyId?: string
): Promise<any> {
  console.log(`[generate-user-profile] Generating for user ${effectiveUserId}`);

  // ── 1. Load existing profile, knowledge, and confirmed assumptions ──

  const [
    existingProfileRes,
    knowledgeRes,
    confirmedAssumptionsRes,
  ] = await Promise.all([
    supabase
      .from('user_profile_biography')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle(),
    supabase
      .from('user_profile_knowledge')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('times_reinforced', { ascending: false }),
    supabase
      .from('user_profile_assumptions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .in('status', ['confirmed']),
  ]);

  const existingProfile = existingProfileRes.data;
  const existingKnowledge = knowledgeRes.data || [];
  const confirmedAssumptions = confirmedAssumptionsRes.data || [];
  const currentGenNumber = existingProfile?.generation_number || 0;
  const newGenNumber = currentGenNumber + 1;
  const lastGeneratedAt = existingProfile?.last_generated_at;

  console.log(`[generate-user-profile] Generation #${newGenNumber}, ${existingKnowledge.length} knowledge items, ${confirmedAssumptions.length} confirmed assumptions`);

  // ── 2. Gather ALL data sources — ALL-TIME, not 30 days ──────────

  const [
    userResult,
    sessionsResult,
    entitiesResult,
    memoryResult,
    templatesResult,
    activityResult,
    journalsResult,
    rejectionsResult,
    deepContentResult,
    memoryImportsResult,
    activityLogResult,
    deepContextResult,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, email, company_id')
      .eq('id', effectiveUserId)
      .single(),

    // ALL sync sessions (not just 20)
    supabase
      .from('sync_sessions')
      .select('conversation_summary, active_entities, context, updated_at')
      .eq('user_id', effectiveUserId)
      .order('updated_at', { ascending: false })
      .limit(50),

    // ALL sync entities
    supabase
      .from('sync_entities')
      .select('name, entity_type, metadata, interaction_count')
      .eq('user_id', effectiveUserId)
      .order('interaction_count', { ascending: false })
      .limit(30),

    // ALL memory chunks
    supabase
      .from('sync_memory_chunks')
      .select('content, chunk_type, importance_score')
      .eq('user_id', effectiveUserId)
      .order('importance_score', { ascending: false })
      .limit(20),

    supabase
      .from('sync_action_templates')
      .select('action_type, intent_description, example_request')
      .eq('user_id', effectiveUserId)
      .order('use_count', { ascending: false })
      .limit(10),

    // ALL desktop activity — aggregated
    supabase
      .from('desktop_activity_logs')
      .select('app_name, semantic_category, total_minutes, hour_start')
      .eq('user_id', effectiveUserId)
      .limit(2000),

    // ALL daily journals
    supabase
      .from('daily_journals')
      .select('journal_date, content, highlights, productivity_score, summary_points, timeline_narrative, personal_notes, weekly_context, communications, action_items, focus_areas, overview')
      .eq('user_id', effectiveUserId)
      .order('journal_date', { ascending: false })
      .limit(60),

    // Rejected assumptions (corrections)
    supabase
      .from('user_profile_assumptions')
      .select('category, assumption, user_feedback')
      .eq('user_id', effectiveUserId)
      .eq('status', 'rejected'),

    supabase
      .from('deep_content')
      .select('content_type, title, summary, key_topics, sentiment, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('user_memory_imports')
      .select('provider, topics, preferences, key_facts, writing_style, summary')
      .eq('user_id', effectiveUserId)
      .eq('status', 'completed'),

    supabase
      .from('user_activity_log')
      .select('event_type, event_name, page_path, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(100),

    // ALL deep context events
    supabase
      .from('desktop_context_events')
      .select('event_type, source_application, source_window_title, summary, entities, commitments, skill_signals, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const userData = userResult.data;
  const sessions = sessionsResult.data || [];
  const entities = entitiesResult.data || [];
  const memoryChunks = memoryResult.data || [];
  const actionTemplates = templatesResult.data || [];
  const activityLogs = activityResult.data || [];
  const journals = journalsResult.data || [];
  const rejections = rejectionsResult.data || [];
  const deepContent = deepContentResult.data || [];
  const memoryImports = memoryImportsResult.data || [];
  const inAppActivity = activityLogResult.data || [];
  const deepContextEvents = deepContextResult.data || [];

  if (!effectiveCompanyId && userData?.company_id) {
    effectiveCompanyId = userData.company_id;
  }

  console.log(`[generate-user-profile] Data: sessions=${sessions.length}, entities=${entities.length}, activity=${activityLogs.length}, journals=${journals.length}, deepContext=${deepContextEvents.length}`);

  // ── 3. Build data string — ALL-TIME with aggregation ────────────

  let userDataStr = buildUserDataString(
    userData, sessions, entities, memoryChunks, actionTemplates,
    activityLogs, journals, deepContent, memoryImports,
    inAppActivity, deepContextEvents
  );

  if (userDataStr.length > 45000) {
    userDataStr = userDataStr.slice(0, 45000) + '\n...(truncated)';
  }

  // ── 4. Build accumulation context ───────────────────────────────

  let accumulationContext = '';

  if (existingKnowledge.length > 0) {
    accumulationContext += 'ACCUMULATED KNOWLEDGE (confirmed facts — PRESERVE these):\n';
    for (const k of existingKnowledge) {
      const lockStr = k.is_locked ? ' [LOCKED]' : '';
      accumulationContext += `- [${k.category}] ${k.knowledge} (confidence: ${k.confidence}, reinforced ${k.times_reinforced}x, first seen: ${k.first_observed_at?.split('T')[0] || '?'})${lockStr}\n`;
    }
    accumulationContext += '\n';
  }

  if (existingProfile?.biography) {
    accumulationContext += 'PREVIOUS BIOGRAPHY (evolve and expand, do NOT rewrite from scratch):\n';
    accumulationContext += existingProfile.biography + '\n\n';
  }

  if (confirmedAssumptions.length > 0) {
    accumulationContext += 'CONFIRMED ASSUMPTIONS (user validated — MUST remain as assumptions):\n';
    for (const a of confirmedAssumptions) {
      accumulationContext += `- [${a.category}] "${a.assumption}" (confirmed${a.times_confirmed > 1 ? ` ${a.times_confirmed}x` : ''})\n`;
    }
    accumulationContext += '\n';
  }

  if (lastGeneratedAt) {
    accumulationContext += `LAST PROFILE GENERATION: ${lastGeneratedAt}\n`;
    accumulationContext += `GENERATION NUMBER: ${newGenNumber}\n\n`;
  }

  // ── 5. Data sufficiency ─────────────────────────────────────────

  const sufficiencyParts: string[] = [];
  if (activityLogs.length < 10) sufficiencyParts.push('- INSUFFICIENT DESKTOP DATA: Only ' + activityLogs.length + ' rows.');
  if (journals.length < 3) sufficiencyParts.push('- LIMITED JOURNAL DATA: Only ' + journals.length + ' journals.');
  if (deepContextEvents.length < 5) sufficiencyParts.push('- LIMITED DEEP CONTEXT: Only ' + deepContextEvents.length + ' events.');
  if (sessions.length < 3) sufficiencyParts.push('- LIMITED CONVERSATION DATA: Only ' + sessions.length + ' sessions.');
  const dataSufficiencyNotes = sufficiencyParts.length > 0
    ? sufficiencyParts.join('\n')
    : '- All data sources have sufficient records.';

  // Corrections
  let correctionsStr = 'None';
  if (rejections.length > 0) {
    correctionsStr = rejections.map(r =>
      `- [${r.category}] "${r.assumption}" — Feedback: ${r.user_feedback || 'rejected'}`
    ).join('\n');

    const themes = new Set<string>();
    for (const r of rejections) {
      if (r.category) themes.add(r.category);
      const text = (r.assumption || '').toLowerCase();
      if (text.includes('night owl') || text.includes('early bird') || text.includes('morning person')) themes.add('sleep_schedule');
      if (text.includes('introvert') || text.includes('extrovert')) themes.add('personality_type');
      if (text.includes('perfectionist') || text.includes('ambitious')) themes.add('personality_traits');
    }
    if (themes.size > 0) {
      correctionsStr += '\n\nCORRECTION THEMES TO AVOID: ' + [...themes].join(', ');
    }
  }

  // ── 6. LLM call ────────────────────────────────────────────────

  const isFirstGeneration = !existingProfile?.biography;

  const systemPrompt = `You are building a factual profile for a user of iSyncSO, an AI-powered business platform.

${isFirstGeneration ? 'This is the FIRST profile generation. Create a fresh biography from scratch.' : `This is generation #${newGenNumber}. You must EVOLVE the existing profile, not replace it. Add new insights from new data while preserving everything that was already established.`}

ABSOLUTE RULE — ZERO FABRICATION:
You MUST only write things that are DIRECTLY evidenced in the provided data. If the data does not contain information about something, DO NOT mention it. An empty section is infinitely better than a fabricated one.
Every single claim must trace back to a specific data point. If you cannot point to the exact data that supports a sentence, delete it.

${!isFirstGeneration ? `ACCUMULATION RULES:
1. PRESERVE all accumulated knowledge and confirmed assumptions listed below
2. EVOLVE the biography — ADD new paragraphs, REFINE existing ones, NEVER erase confirmed facts
3. If the previous biography says "uses VS Code" and new data confirms this, keep it and add any new details
4. New assumptions should be ADDITIONAL to what already exists, not replacements
5. If an assumption was already confirmed by the user, include it again with the same text` : ''}

Generate a profile in JSON format:

{
  "biography": "${isFirstGeneration ? 'Factual biography in third person.' : 'EVOLVED biography — preserve existing content, add new insights from new data. Should be at least as long as the previous version unless data was incorrect.'}",
  "tagline": "Short descriptor based on actual work.",

  "superpowers_summary": "Skills evidenced by data only. Empty string if no data.",
  "work_dna_summary": "Work patterns from activity logs and journals only.",
  "social_circle_summary": "Collaboration patterns from data only.",
  "digital_life_summary": "App usage from activity logs only.",
  "client_world_summary": "Client info from entities/sessions only.",
  "interests_summary": "Only if explicit interest data exists.",
  "daily_rhythms_summary": "From activity log hour data only.",

  "daily_rhythms": [{"hour": 9, "activity_count": 15, "primary_activity": "coding"}],
  "work_style": ["Observable traits only"],
  "interests": ["Only from explicit data"],
  "skills": ["From observed tool usage only"],
  "top_coworkers": [{"name": "...", "interaction_count": 0, "context": "..."}],
  "top_apps": [{"name": "...", "avg_daily_minutes": 0, "category": "..."}],
  "top_clients": [{"name": "...", "interaction_count": 0}],

  "new_knowledge": [
    {
      "category": "skill|tool|client|habit|preference|fact",
      "knowledge": "A factual statement derived from data",
      "confidence": 0.0-1.0,
      "evidence": "Exact data points"
    }
  ],

  "assumptions": [
    {
      "category": "work_style|preference|skill|interest|habit|goal|strength",
      "assumption": "Factual statement directly supported by data",
      "confidence": 0.0-1.0,
      "evidence": "Exact data points",
      "source": "conversation|activity|entity|journal|deep_context|memory_import"
    }
  ]
}

GUIDELINES:
- ZERO FABRICATION. #1 rule.
- Write short and factual.
- Generate 5-15 assumptions max. Quality over quantity.
- Generate 3-10 new_knowledge items — factual insights that should persist across generations.
- NEVER infer personality traits, emotions, motivations, or future goals.
- NEVER invent physical descriptions, transportation, food, sports, or social activities.

DATA SUFFICIENCY NOTES:
${dataSufficiencyNotes}

Respond ONLY with valid JSON.`;

  const userPrompt = `${accumulationContext}CORRECTIONS FROM USER:
${correctionsStr}

USER DATA (ALL-TIME):
${userDataStr}`;

  if (!TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API_KEY not configured');
  }

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
      temperature: 0.2,
      max_tokens: 16000,
    }),
  });

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text();
    throw new Error(`LLM API error ${llmResponse.status}: ${errorText}`);
  }

  const llmResult = await llmResponse.json();
  const content = llmResult.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in LLM response');

  // Parse JSON
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse LLM JSON');
  }

  // ── 7. Extract profile data ─────────────────────────────────────

  const biography = parsed.biography || '';
  const tagline = parsed.tagline || '';
  const workStyle = Array.isArray(parsed.work_style) ? parsed.work_style : [];
  const interests = Array.isArray(parsed.interests) ? parsed.interests : [];
  const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const topCoworkers = Array.isArray(parsed.top_coworkers) ? parsed.top_coworkers : [];
  const topApps = Array.isArray(parsed.top_apps) ? parsed.top_apps : [];
  const topClients = Array.isArray(parsed.top_clients) ? parsed.top_clients : [];
  const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];
  const newKnowledge = Array.isArray(parsed.new_knowledge) ? parsed.new_knowledge : [];

  const superpowersSummary = parsed.superpowers_summary || '';
  const workDnaSummary = parsed.work_dna_summary || '';
  const socialCircleSummary = parsed.social_circle_summary || '';
  const digitalLifeSummary = parsed.digital_life_summary || '';
  const clientWorldSummary = parsed.client_world_summary || '';
  const interestsSummary = parsed.interests_summary || '';
  const dailyRhythmsSummary = parsed.daily_rhythms_summary || '';
  const dailyRhythms = Array.isArray(parsed.daily_rhythms) ? parsed.daily_rhythms : [];

  const dataSources: Record<string, number> = {
    sessions: sessions.length,
    entities: entities.length,
    memory_chunks: memoryChunks.length,
    action_templates: actionTemplates.length,
    activity_logs: activityLogs.length,
    activity_days: new Set(activityLogs.map(l => l.hour_start?.split('T')[0]).filter(Boolean)).size,
    journals: journals.length,
    deep_content: deepContent.length,
    memory_imports: memoryImports.length,
    in_app_activity: inAppActivity.length,
    deep_context_events: deepContextEvents.length,
  };

  // ── 8. Save history snapshot ────────────────────────────────────

  await supabase.from('user_profile_history').insert({
    user_id: effectiveUserId,
    generation_number: newGenNumber,
    biography,
    tagline,
    chapter_summaries: {
      superpowers: superpowersSummary,
      work_dna: workDnaSummary,
      social_circle: socialCircleSummary,
      digital_life: digitalLifeSummary,
      client_world: clientWorldSummary,
      interests: interestsSummary,
      daily_rhythms: dailyRhythmsSummary,
    },
    structured_data: { workStyle, interests, skills, topCoworkers, topApps, topClients, dailyRhythms },
    assumption_snapshot: assumptions,
    data_source_counts: dataSources,
    generation_model: 'moonshotai/Kimi-K2-Instruct',
  });

  // ── 9. Process knowledge ────────────────────────────────────────

  // Insert/reinforce new knowledge items
  let knowledgeInserted = 0;
  for (const k of newKnowledge) {
    if (!k.knowledge || !k.category) continue;
    if (typeof k.confidence === 'number' && k.confidence < 0.4) continue;

    try {
      // Try upsert — if exists, reinforce; if new, insert
      const { data: existing } = await supabase
        .from('user_profile_knowledge')
        .select('id, times_reinforced')
        .eq('user_id', effectiveUserId)
        .eq('category', k.category)
        .eq('knowledge', k.knowledge)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_profile_knowledge')
          .update({
            times_reinforced: (existing.times_reinforced || 1) + 1,
            last_reinforced_at: new Date().toISOString(),
            confidence: Math.min(1.0, (k.confidence || 0.5) + 0.05),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_profile_knowledge')
          .insert({
            user_id: effectiveUserId,
            category: k.category,
            knowledge: k.knowledge,
            confidence: k.confidence || 0.5,
            source: 'llm_derived',
            evidence: k.evidence ? [k.evidence] : [],
          });
        knowledgeInserted++;
      }
    } catch {
      // Unique constraint violation or other — skip
    }
  }

  // Reinforce knowledge that matches new assumptions
  for (const a of assumptions) {
    for (const k of existingKnowledge) {
      if (a.assumption && k.knowledge &&
          a.assumption.toLowerCase().includes(k.knowledge.toLowerCase())) {
        await supabase
          .from('user_profile_knowledge')
          .update({
            times_reinforced: (k.times_reinforced || 1) + 1,
            last_reinforced_at: new Date().toISOString(),
          })
          .eq('id', k.id);
        break;
      }
    }
  }

  // ── 10. Calculate depth score ───────────────────────────────────

  const totalKnowledge = existingKnowledge.length + knowledgeInserted;
  const confirmedCount = confirmedAssumptions.length;
  const totalDataPoints = Object.values(dataSources).reduce((a, b) => a + b, 0);

  // Score from 0-100 based on data richness + confirmation depth
  const depthScore = Math.min(100, Math.round(
    (Math.min(totalKnowledge, 30) / 30) * 25 +   // Knowledge breadth (max 25)
    (Math.min(confirmedCount, 20) / 20) * 25 +     // User confirmation (max 25)
    (Math.min(newGenNumber, 12) / 12) * 20 +        // Generation history (max 20)
    (Math.min(totalDataPoints, 500) / 500) * 30      // Data richness (max 30)
  ));

  // ── 11. Upsert biography ───────────────────────────────────────

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
      superpowers_summary: superpowersSummary,
      work_dna_summary: workDnaSummary,
      social_circle_summary: socialCircleSummary,
      digital_life_summary: digitalLifeSummary,
      client_world_summary: clientWorldSummary,
      interests_summary: interestsSummary,
      daily_rhythms_summary: dailyRhythmsSummary,
      daily_rhythms: dailyRhythms,
      data_sources_used: dataSources,
      generation_model: 'moonshotai/Kimi-K2-Instruct',
      generation_number: newGenNumber,
      knowledge_count: totalKnowledge,
      profile_depth_score: depthScore,
      last_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (profileError) {
    throw new Error(`Failed to save biography: ${profileError.message}`);
  }

  // ── 12. Handle assumptions — preserve confirmed/locked ──────────

  // Only delete ACTIVE (unreviewed) assumptions — confirmed and rejected stay
  await supabase
    .from('user_profile_assumptions')
    .delete()
    .eq('user_id', effectiveUserId)
    .eq('status', 'active');

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
      first_seen_at: new Date().toISOString(),
    }));

    await supabase.from('user_profile_assumptions').insert(assumptionRows);
  }

  console.log(`[generate-user-profile] Gen #${newGenNumber} done: ${assumptions.length} assumptions, ${knowledgeInserted} new knowledge, depth=${depthScore}`);

  return {
    success: true,
    profile: profileData,
    generation_number: newGenNumber,
    assumptions_count: assumptions.length,
    knowledge_new: knowledgeInserted,
    knowledge_total: totalKnowledge,
    depth_score: depthScore,
    data_sources: dataSources,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Build user data string from all sources
// ═══════════════════════════════════════════════════════════════════════

function buildUserDataString(
  userData: any,
  sessions: any[],
  entities: any[],
  memoryChunks: any[],
  actionTemplates: any[],
  activityLogs: any[],
  journals: any[],
  deepContent: any[],
  memoryImports: any[],
  inAppActivity: any[],
  deepContextEvents: any[],
): string {
  let s = '';

  if (userData) {
    s += `Name: ${userData.name || 'Unknown'}\nEmail: ${userData.email || 'Unknown'}\n\n`;
  }

  if (sessions.length > 0) {
    s += 'CONVERSATIONS (ALL-TIME):\n';
    for (const sess of sessions) {
      if (sess.conversation_summary) {
        s += `- ${truncateText(sess.conversation_summary, 200)}\n`;
      }
      if (sess.active_entities && typeof sess.active_entities === 'object') {
        const entityNames = Object.values(sess.active_entities).flat().slice(0, 5);
        if (entityNames.length > 0) {
          s += `  Entities: ${entityNames.join(', ')}\n`;
        }
      }
    }
    s += '\n';
  }

  if (entities.length > 0) {
    s += 'TOP ENTITIES:\n';
    for (const e of entities) {
      s += `- ${e.name} (${e.entity_type}, ${e.interaction_count} interactions)\n`;
    }
    s += '\n';
  }

  if (memoryChunks.length > 0) {
    s += 'KEY MEMORY INSIGHTS:\n';
    for (const m of memoryChunks) {
      s += `- [${m.chunk_type}] ${truncateText(m.content, 200)}\n`;
    }
    s += '\n';
  }

  if (actionTemplates.length > 0) {
    s += 'FREQUENT ACTIONS:\n';
    for (const t of actionTemplates) {
      s += `- ${t.action_type}: ${t.intent_description || t.example_request || ''}\n`;
    }
    s += '\n';
  }

  // ALL-TIME desktop activity — aggregate by app
  if (activityLogs.length > 0) {
    const appMap = new Map<string, { minutes: number; category: string; firstSeen: string; lastSeen: string }>();
    for (const log of activityLogs) {
      const key = log.app_name || 'Unknown';
      const existing = appMap.get(key);
      if (existing) {
        existing.minutes += log.total_minutes || 0;
        if (log.hour_start < existing.firstSeen) existing.firstSeen = log.hour_start;
        if (log.hour_start > existing.lastSeen) existing.lastSeen = log.hour_start;
      } else {
        appMap.set(key, {
          minutes: log.total_minutes || 0,
          category: log.semantic_category || 'Other',
          firstSeen: log.hour_start || '',
          lastSeen: log.hour_start || '',
        });
      }
    }
    const sorted = Array.from(appMap.entries())
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 20);

    const totalDays = new Set(activityLogs.map(l => l.hour_start?.split('T')[0]).filter(Boolean)).size;

    s += `DESKTOP ACTIVITY (ALL-TIME, ${totalDays} days tracked):\n`;
    for (const [app, data] of sorted) {
      const hours = Math.round(data.minutes / 60 * 10) / 10;
      const dailyAvg = totalDays > 0 ? Math.round(data.minutes / totalDays * 10) / 10 : 0;
      s += `- ${app} (${data.category}): ${hours}h total, ~${dailyAvg}min/day avg\n`;
    }
    s += '\n';
  }

  // Journals — recent detailed, older summarized
  if (journals.length > 0) {
    const recent = journals.slice(0, 14); // Detailed for last 14
    const older = journals.slice(14);

    s += `DAILY JOURNALS (${journals.length} total):\n`;

    for (const j of recent) {
      s += `\n=== ${j.journal_date} (productivity: ${Math.round((j.productivity_score || 0) * 100)}%) ===\n`;
      if (j.overview) s += `Overview: ${truncateText(j.overview, 400)}\n`;
      if (j.content) s += `Narrative: ${truncateText(j.content, 600)}\n`;
      if (j.focus_areas && Array.isArray(j.focus_areas) && j.focus_areas.length > 0) {
        const areas = j.focus_areas.slice(0, 6).map((a: any) =>
          typeof a === 'string' ? a : `${a.category || a.area || ''}: ${a.percentage || a.minutes || ''}${a.percentage ? '%' : 'm'}`
        ).filter(Boolean);
        if (areas.length > 0) s += `Focus: ${areas.join(', ')}\n`;
      }
      if (j.highlights && Array.isArray(j.highlights)) {
        const texts = j.highlights.slice(0, 5).map((h: any) => typeof h === 'string' ? h : h.description || '').filter(Boolean);
        if (texts.length > 0) s += `Highlights: ${texts.join('; ')}\n`;
      }
      if (j.summary_points && Array.isArray(j.summary_points) && j.summary_points.length > 0) {
        const points = j.summary_points.slice(0, 8).map((p: any) => typeof p === 'string' ? p : p.point || p.text || '').filter(Boolean);
        if (points.length > 0) s += `Points: ${points.join('; ')}\n`;
      }
      if (j.timeline_narrative) s += `Timeline: ${truncateText(j.timeline_narrative, 300)}\n`;
      if (j.personal_notes) s += `Notes: ${truncateText(j.personal_notes, 200)}\n`;
      if (j.communications) s += `Comms: ${truncateText(j.communications, 200)}\n`;
    }

    if (older.length > 0) {
      s += `\nOLDER JOURNALS SUMMARY (${older.length} entries from ${older[older.length - 1]?.journal_date} to ${older[0]?.journal_date}):\n`;
      // Aggregate topics from older journals
      const allHighlights: string[] = [];
      for (const j of older) {
        if (j.overview) allHighlights.push(truncateText(j.overview, 100));
        if (j.highlights && Array.isArray(j.highlights)) {
          for (const h of j.highlights.slice(0, 3)) {
            const text = typeof h === 'string' ? h : h.description || '';
            if (text) allHighlights.push(truncateText(text, 80));
          }
        }
      }
      s += allHighlights.slice(0, 20).map(h => `- ${h}`).join('\n') + '\n';
    }
    s += '\n';
  }

  if (deepContent.length > 0) {
    s += 'DEEP CONTENT:\n';
    for (const dc of deepContent) {
      s += `- [${dc.content_type}] ${dc.title || 'Untitled'}`;
      if (dc.summary) s += `: ${truncateText(dc.summary, 200)}`;
      if (dc.key_topics?.length > 0) s += ` (${dc.key_topics.slice(0, 5).join(', ')})`;
      s += '\n';
    }
    s += '\n';
  }

  if (memoryImports.length > 0) {
    s += 'AI MEMORY IMPORTS:\n';
    for (const mi of memoryImports) {
      s += `Provider: ${mi.provider}\n`;
      if (mi.summary) s += `  Summary: ${truncateText(mi.summary, 300)}\n`;
      if (mi.topics?.length > 0) {
        const names = mi.topics.slice(0, 10).map((t: any) => typeof t === 'string' ? t : t.topic || t.name || '').filter(Boolean);
        if (names.length > 0) s += `  Topics: ${names.join(', ')}\n`;
      }
      if (mi.key_facts?.length > 0) {
        const facts = mi.key_facts.slice(0, 8).map((f: any) => typeof f === 'string' ? f : f.fact || '').filter(Boolean);
        if (facts.length > 0) s += `  Facts: ${facts.join('; ')}\n`;
      }
    }
    s += '\n';
  }

  if (inAppActivity.length > 0) {
    const actMap = new Map<string, { count: number; type: string }>();
    for (const ev of inAppActivity) {
      const key = ev.event_name || ev.page_path || 'unknown';
      const ex = actMap.get(key);
      if (ex) ex.count += 1;
      else actMap.set(key, { count: 1, type: ev.event_type });
    }
    const sortedAct = Array.from(actMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 15);
    s += 'IN-APP ACTIVITY:\n';
    for (const [name, data] of sortedAct) {
      s += `- ${name} (${data.type}, ${data.count}x)\n`;
    }
    s += '\n';
  }

  if (deepContextEvents.length > 0) {
    s += 'DEEP CONTEXT — SCREEN CAPTURES:\n';
    const workPatterns = new Map<string, { count: number; apps: Set<string> }>();
    const allSkills = new Set<string>();

    for (const ev of deepContextEvents) {
      const topic = ev.source_window_title || ev.summary || `${ev.event_type} in ${ev.source_application}`;
      const ex = workPatterns.get(topic);
      if (ex) { ex.count++; ex.apps.add(ev.source_application); }
      else { workPatterns.set(topic, { count: 1, apps: new Set([ev.source_application]) }); }

      if (ev.skill_signals && Array.isArray(ev.skill_signals)) {
        for (const sk of ev.skill_signals) {
          const path = Array.isArray(sk.skillPath) ? sk.skillPath.join(' > ') : (sk.skillCategory || '');
          if (path) allSkills.add(path);
        }
      }
    }

    const sortedPat = Array.from(workPatterns.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 30);
    for (const [topic, data] of sortedPat) {
      s += `- "${truncateText(topic, 120)}" — ${data.count}x across ${[...data.apps].join(', ')}\n`;
    }
    if (allSkills.size > 0) {
      s += `Skills from screen: ${[...allSkills].slice(0, 15).join(', ')}\n`;
    }
    s += '\n';
  }

  return s;
}
