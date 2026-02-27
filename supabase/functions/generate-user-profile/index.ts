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
      deepContentResult,
      memoryImportsResult,
      activityLogResult,
      deepContextResult,
    ] = await Promise.all([
      // User data
      supabase
        .from('users')
        .select('name, email, company_id')
        .eq('id', effectiveUserId)
        .single(),

      // Last 20 sync sessions
      supabase
        .from('sync_sessions')
        .select('conversation_summary, active_entities, context')
        .eq('user_id', effectiveUserId)
        .order('updated_at', { ascending: false })
        .limit(20),

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

      // Last 14 daily journals (with ALL rich fields)
      supabase
        .from('daily_journals')
        .select('journal_date, content, highlights, productivity_score, summary_points, timeline_narrative, personal_notes, weekly_context, communications, action_items, focus_areas, overview')
        .eq('user_id', effectiveUserId)
        .order('journal_date', { ascending: false })
        .limit(14),

      // Existing rejected assumptions (corrections)
      supabase
        .from('user_profile_assumptions')
        .select('category, assumption, user_feedback')
        .eq('user_id', effectiveUserId)
        .eq('status', 'rejected'),

      // Deep content captures (emails, code, documents from SkillSync)
      supabase
        .from('deep_content')
        .select('content_type, title, summary, key_topics, sentiment, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Completed memory imports (ChatGPT/Claude exports)
      supabase
        .from('user_memory_imports')
        .select('provider, topics, preferences, key_facts, writing_style, summary')
        .eq('user_id', effectiveUserId)
        .eq('status', 'completed'),

      // Recent in-app activity log
      supabase
        .from('user_activity_log')
        .select('event_type, event_name, page_path, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Deep context events (semantic screen captures from desktop)
      supabase
        .from('desktop_context_events')
        .select('event_type, source_application, source_window_title, summary, entities, commitments, skill_signals, created_at')
        .eq('user_id', effectiveUserId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200),
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
    const deepContent = deepContentResult.data || [];
    const memoryImports = memoryImportsResult.data || [];
    const inAppActivity = activityLogResult.data || [];
    const deepContextEvents = deepContextResult.data || [];

    if (!effectiveCompanyId && userData?.company_id) {
      effectiveCompanyId = userData.company_id;
    }

    // Log data availability
    console.log(`[generate-user-profile] Data gathered: user=${!!userData}, sessions=${sessions.length}, entities=${entities.length}, memory=${memoryChunks.length}, templates=${actionTemplates.length}, activity=${activityLogs.length}, journals=${journals.length}, rejections=${rejections.length}, deepContent=${deepContent.length}, memoryImports=${memoryImports.length}, inAppActivity=${inAppActivity.length}, deepContext=${deepContextEvents.length}`);

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
      userDataStr += 'RECENT DAILY JOURNALS (rich detail — use heavily for profile):\n';
      for (const j of journals) {
        userDataStr += `\n=== ${j.journal_date} (productivity: ${Math.round((j.productivity_score || 0) * 100)}%) ===\n`;
        if (j.overview) {
          userDataStr += `Overview: ${truncateText(j.overview, 400)}\n`;
        }
        if (j.content) {
          userDataStr += `Full narrative: ${truncateText(j.content, 800)}\n`;
        }
        if (j.focus_areas && Array.isArray(j.focus_areas) && j.focus_areas.length > 0) {
          const areas = j.focus_areas.slice(0, 6).map((a: any) =>
            typeof a === 'string' ? a : `${a.category || a.area || ''}: ${a.percentage || a.minutes || ''}${a.percentage ? '%' : 'm'}`
          ).filter(Boolean);
          if (areas.length > 0) {
            userDataStr += `Focus areas: ${areas.join(', ')}\n`;
          }
        }
        if (j.highlights && Array.isArray(j.highlights)) {
          const highlightTexts = j.highlights.slice(0, 5).map((h: any) =>
            typeof h === 'string' ? h : h.description || ''
          ).filter(Boolean);
          if (highlightTexts.length > 0) {
            userDataStr += `Highlights: ${highlightTexts.join('; ')}\n`;
          }
        }
        if (j.summary_points && Array.isArray(j.summary_points) && j.summary_points.length > 0) {
          const points = j.summary_points.slice(0, 8).map((p: any) =>
            typeof p === 'string' ? p : p.point || p.text || ''
          ).filter(Boolean);
          if (points.length > 0) {
            userDataStr += `Key points: ${points.join('; ')}\n`;
          }
        }
        if (j.timeline_narrative) {
          userDataStr += `Day timeline: ${truncateText(j.timeline_narrative, 500)}\n`;
        }
        if (j.weekly_context) {
          userDataStr += `Weekly context: ${truncateText(j.weekly_context, 300)}\n`;
        }
        if (j.personal_notes) {
          userDataStr += `Personal notes: ${truncateText(j.personal_notes, 300)}\n`;
        }
        if (j.communications) {
          userDataStr += `Communications: ${truncateText(j.communications, 300)}\n`;
        }
        if (j.action_items && Array.isArray(j.action_items) && j.action_items.length > 0) {
          const items = j.action_items.slice(0, 8).map((a: any) =>
            typeof a === 'string' ? a : a.item || a.task || a.text || ''
          ).filter(Boolean);
          if (items.length > 0) {
            userDataStr += `Action items: ${items.join('; ')}\n`;
          }
        }
      }
      userDataStr += '\n';
    }

    if (deepContent.length > 0) {
      userDataStr += 'DEEP CONTENT (emails, code, documents captured by SkillSync):\n';
      for (const dc of deepContent) {
        userDataStr += `- [${dc.content_type}] ${dc.title || 'Untitled'}`;
        if (dc.summary) {
          userDataStr += `: ${truncateText(dc.summary, 200)}`;
        }
        if (dc.key_topics && Array.isArray(dc.key_topics) && dc.key_topics.length > 0) {
          userDataStr += ` (topics: ${dc.key_topics.slice(0, 5).join(', ')})`;
        }
        if (dc.sentiment) {
          userDataStr += ` [sentiment: ${dc.sentiment}]`;
        }
        userDataStr += '\n';
      }
      userDataStr += '\n';
    }

    if (memoryImports.length > 0) {
      userDataStr += 'AI MEMORY IMPORTS (from ChatGPT/Claude exports):\n';
      for (const mi of memoryImports) {
        userDataStr += `Provider: ${mi.provider}\n`;
        if (mi.summary) {
          userDataStr += `  Summary: ${truncateText(mi.summary, 300)}\n`;
        }
        if (mi.topics && Array.isArray(mi.topics) && mi.topics.length > 0) {
          const topicNames = mi.topics.slice(0, 10).map((t: any) =>
            typeof t === 'string' ? t : t.topic || t.name || ''
          ).filter(Boolean);
          if (topicNames.length > 0) {
            userDataStr += `  Topics: ${topicNames.join(', ')}\n`;
          }
        }
        if (mi.preferences && Array.isArray(mi.preferences) && mi.preferences.length > 0) {
          const prefs = mi.preferences.slice(0, 8).map((p: any) =>
            typeof p === 'string' ? p : `${p.category || ''}: ${p.preference || ''}`
          ).filter(Boolean);
          if (prefs.length > 0) {
            userDataStr += `  Preferences: ${prefs.join('; ')}\n`;
          }
        }
        if (mi.key_facts && Array.isArray(mi.key_facts) && mi.key_facts.length > 0) {
          const facts = mi.key_facts.slice(0, 8).map((f: any) =>
            typeof f === 'string' ? f : f.fact || ''
          ).filter(Boolean);
          if (facts.length > 0) {
            userDataStr += `  Key facts: ${facts.join('; ')}\n`;
          }
        }
        if (mi.writing_style) {
          userDataStr += `  Writing style: ${truncateText(mi.writing_style, 150)}\n`;
        }
      }
      userDataStr += '\n';
    }

    if (inAppActivity.length > 0) {
      // Aggregate activity by event_name for conciseness
      const activityMap = new Map<string, { count: number; type: string; lastSeen: string }>();
      for (const ev of inAppActivity) {
        const key = ev.event_name || ev.page_path || 'unknown';
        const existing = activityMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          activityMap.set(key, { count: 1, type: ev.event_type, lastSeen: ev.created_at });
        }
      }
      const sortedActivity = Array.from(activityMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15);

      userDataStr += 'IN-APP ACTIVITY (recent usage patterns):\n';
      for (const [name, data] of sortedActivity) {
        userDataStr += `- ${name} (${data.type}, ${data.count}x)\n`;
      }
      userDataStr += '\n';
    }

    if (deepContextEvents.length > 0) {
      userDataStr += 'DEEP CONTEXT — WHAT THE USER ACTUALLY WORKS ON (screen captures with semantic analysis):\n';

      // Aggregate by summary/window title to show work patterns
      const workPatterns = new Map<string, { count: number; apps: Set<string>; types: Set<string>; lastSeen: string }>();
      const allCommitmentsFromContext: string[] = [];
      const allSkillsFromContext = new Set<string>();

      for (const ev of deepContextEvents) {
        // Aggregate work patterns
        const topic = ev.source_window_title || ev.summary || `${ev.event_type} in ${ev.source_application}`;
        const existing = workPatterns.get(topic);
        if (existing) {
          existing.count++;
          existing.apps.add(ev.source_application);
          existing.types.add(ev.event_type);
        } else {
          workPatterns.set(topic, {
            count: 1,
            apps: new Set([ev.source_application]),
            types: new Set([ev.event_type]),
            lastSeen: ev.created_at,
          });
        }

        // Collect commitments
        if (ev.commitments && Array.isArray(ev.commitments)) {
          for (const c of ev.commitments) {
            const desc = c.description || c.text || '';
            if (desc && !allCommitmentsFromContext.includes(desc)) {
              allCommitmentsFromContext.push(desc);
            }
          }
        }

        // Collect skills
        if (ev.skill_signals && Array.isArray(ev.skill_signals)) {
          for (const s of ev.skill_signals) {
            const path = Array.isArray(s.skillPath) ? s.skillPath.join(' > ') : (s.skillCategory || '');
            if (path) allSkillsFromContext.add(path);
          }
        }
      }

      // Sort by frequency and show top work topics
      const sortedPatterns = Array.from(workPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 30);

      userDataStr += 'Top work topics (by time spent):\n';
      for (const [topic, data] of sortedPatterns) {
        const mins = Math.round(data.count * 0.5);
        userDataStr += `- "${truncateText(topic, 120)}" — ${mins}m across ${[...data.apps].join(', ')} (${[...data.types].join('/')})\n`;
      }

      if (allCommitmentsFromContext.length > 0) {
        userDataStr += `\nCommitments detected from screen: ${allCommitmentsFromContext.slice(0, 10).join('; ')}\n`;
      }
      if (allSkillsFromContext.size > 0) {
        userDataStr += `Skills detected from screen: ${[...allSkillsFromContext].slice(0, 15).join(', ')}\n`;
      }
      userDataStr += '\n';
    }

    // Truncate total data to keep under 40000 chars for richer profiles
    if (userDataStr.length > 40000) {
      userDataStr = userDataStr.slice(0, 40000) + '\n...(truncated)';
    }

    // Build corrections string from rejected assumptions
    let correctionsStr = 'None';
    if (rejections.length > 0) {
      correctionsStr = rejections.map(r =>
        `- [${r.category}] "${r.assumption}" — User feedback: ${r.user_feedback || 'rejected'}`
      ).join('\n');
    }

    // Build LLM prompt
    const systemPrompt = `You are building a rich, detailed personal profile for a user of iSyncSO, an AI-powered business platform. This profile should read like a fascinating character study — someone who knows this person deeply and can paint a vivid picture of who they are professionally and personally.

You have access to their actual screen activity, daily journals, conversations, work patterns, and more. Use ALL of this data to build the most comprehensive, specific, and accurate profile possible.

Generate a profile in JSON format:

{
  "biography": "A rich, detailed biography (5-7 paragraphs) written in third person. This should read like a well-written profile piece:\n\n- Paragraph 1: Who they are — their role, what they build, what drives them\n- Paragraph 2: How they work — their daily rhythm, tools, workflow patterns\n- Paragraph 3: What they're building right now — current projects, features, technical focus\n- Paragraph 4: Their technical identity — languages, frameworks, architecture preferences\n- Paragraph 5: Their communication and collaboration style\n- Paragraph 6: Their interests, passions, and what makes them unique\n- Paragraph 7: The bigger picture — where they seem to be heading, their ambitions\n\nBe SPECIFIC. Reference actual apps they use, actual projects they work on, actual patterns from their journals. Never be generic.",
  "tagline": "A memorable one-liner that captures their essence (be creative and specific, not generic)",
  "work_style": ["8-12 specific traits derived from actual behavior patterns"],
  "interests": ["6-10 interests inferred from browsing, conversations, and activity"],
  "skills": ["10-15 specific technical and professional skills observed in their work"],
  "top_coworkers": [{"name": "...", "interaction_count": 0, "context": "how they interact"}],
  "top_apps": [{"name": "...", "avg_daily_minutes": 0, "category": "..."}],
  "top_clients": [{"name": "...", "interaction_count": 0}],
  "assumptions": [
    {
      "category": "work_style|preference|skill|interest|personality|habit|goal|strength|weakness",
      "assumption": "A specific, insightful statement about the user",
      "confidence": 0.0-1.0,
      "evidence": "What specific data supports this — quote actual journal entries, activity patterns, or conversations",
      "source": "conversation|activity|entity|journal|deep_context|memory_import"
    }
  ]
}

GUIDELINES:
- The biography should be 800-1200 words. Make it rich and detailed.
- Generate 20-30 assumptions. Be bold and specific, not safe and generic.
- Reference SPECIFIC projects, tools, files, and patterns from the data.
- Use the daily journals heavily — they contain the richest narrative about their actual days.
- Use deep context events to understand what they actually work on hour-by-hour.
- Infer personality from behavior patterns (e.g., late-night coding = night owl, frequent context-switching = multitasker).
- Don't be afraid to make educated guesses — that's what assumptions are for.

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
        temperature: 0.5,
        max_tokens: 10000,
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
      deep_content: deepContent.length,
      memory_imports: memoryImports.length,
      in_app_activity: inAppActivity.length,
      deep_context_events: deepContextEvents.length,
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
