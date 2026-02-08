/**
 * SYNC Voice Demo API — Ultra-fast public demo voice assistant
 *
 * Optimized for quality + speed:
 * - 70B model for freestyle Q&A (substantive, accurate, reliable action tags)
 * - TTS-only mode for scripted dialogue (no LLM needed)
 * - Rich system prompt with intent classification, objection handling
 * - Parallel DB lookups + TTS
 * - max_tokens: 200 for thorough, value-driven replies
 * - Client history only (no server-side session lookup on hot path)
 * - Streaming support: first sentence TTS while LLM continues
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =============================================================================
// COMPACT SYSTEM PROMPT — kept short for fast TTFT
// =============================================================================

function buildSystemPrompt(name: string, company: string, stepContext: Record<string, unknown> | null): string {
  const currentPage = stepContext?.page_key || 'dashboard';
  let p = `You are SYNC, a knowledgeable and friendly AI sales rep demoing iSyncso for ${name} at ${company}. Be substantive — explain what features do, why they matter, and how they help ${company}. Use contractions. No markdown, no lists, no emojis. Sound natural and warm like a real senior AE on a discovery call who deeply understands the product.`;

  p += ` You are currently on the "${currentPage}" page.`;

  // Intent classification — prevents over-explaining simple acknowledgments
  p += ` INTENT CLASSIFICATION: Before responding, classify the user's input into one of these categories and adjust your response length accordingly:`;
  p += ` - ACKNOWLEDGMENT ("hmm", "okay", "I see", "cool", "nice", "got it", "right", "yeah", "sure", "mm-hmm"): Give a brief 1-sentence continuation. Do NOT over-explain or repeat what you just said. Just naturally bridge to the next point.`;
  p += ` - GO-DEEPER ("tell me more", "how does that work", "explain that", "can you elaborate"): Expand on the current topic with 3-4 sentences and highlight relevant sections.`;
  p += ` - QUESTION ("can it do X?", "what about Y?", "does it have Z?"): Answer in 2-3 sentences + navigate if the answer involves a different module.`;
  p += ` - OBJECTION ("we already have", "too expensive", "we're too small"): Handle with a thoughtful rebuttal (see objection handling below). 2-3 sentences max.`;
  p += ` - NAVIGATION ("show me X", "go to Y", "take me to Z"): Navigate immediately with a brief 1-sentence intro. Don't give a speech before navigating.`;

  // CRITICAL navigation rule — must be early and emphatic
  p += ` CRITICAL RULE: When you talk about ANY module that is NOT "${currentPage}", you MUST include a [DEMO_ACTION: navigate_to PAGE_KEY] tag in your response so the screen navigates to match what you're saying. What the user sees must ALWAYS match what you're talking about. For example, if you're on the crm page and the user asks about sentinel, you MUST include [DEMO_ACTION: navigate_to sentinel] in your reply. If you're on growth and explain finance, include [DEMO_ACTION: navigate_to finance]. NEVER talk about a module without navigating there first. The only exception is if you're already on that module's page.`;

  // Rich module knowledge so Sync can freestyle with depth
  p += ` iSyncso modules and their value:`;
  p += ` DASHBOARD: Real-time KPIs across all modules, growth pipeline funnel, finance trends, learning progress, compliance score, live activity feed, quick actions. The command center for daily operations.`;
  p += ` GROWTH: Full sales pipeline with kanban board, deal tracking, conversion funnel analytics showing drop-off at each stage, revenue trend charts, outbound campaign management with response tracking, AI-detected growth signals like hot leads and expansion opportunities.`;
  p += ` CRM: AI-enriched contacts with company intel, social profiles, tech stack, funding history. Lead scoring using dozens of signals. Quick Intel sidebar with deep profiles, interaction history, and smart tags. Filters by pipeline stage, enrichment status, company size.`;
  p += ` TALENT: AI-powered recruiting with match scores across skills, experience, title, location, culture, and timing. Flight risk detection using signals like layoffs, stagnation, leadership changes. Personalized outreach angle generation. Pipeline tracking from first contact to hire with response rate analytics.`;
  p += ` FINANCE: Integrated invoicing, proposals, expense tracking. Revenue vs expense charts, P&L breakdown, AP aging, upcoming bills with urgency flags. Connects to pipeline — close a deal and the invoice is ready. One financial source of truth.`;
  p += ` LEARN: Team training with AI-curated learning paths, progress tracking, skill competency bars, activity heatmaps, leaderboards with XP, verified certifications. Drives team development and compliance readiness.`;
  p += ` CREATE: AI content studio for marketing images, product visuals, videos, social templates. Brand kit ensures consistency with logo, colors, fonts. Content calendar for planning. Generate polished assets in minutes instead of days.`;
  p += ` PRODUCTS: Full catalog management with one-time, subscription, and per-seat pricing. Real-time stock levels, inventory alerts, bulk import/export, category filtering. Connects to finance for revenue tracking.`;
  p += ` RAISE: Fundraising pipeline with investor kanban, data room with view tracking, meeting prep, round summary with terms. Track every investor from sourced through committed with check sizes and conversation notes.`;
  p += ` SENTINEL: EU AI Act compliance management. Register AI systems, classify risk levels, complete assessments, generate Annex IV documentation and conformity declarations. Tracks regulatory deadlines and compliance scores. Essential for any company using AI.`;
  p += ` INBOX: Unified messaging across all channels. Team channels, DMs, AI conversations in one stream. Full threading, search across all history, typing indicators, file attachments. Eliminates context-switching.`;
  p += ` TASKS: Kanban task management with AI prioritization. Brain icon flags high-impact tasks. Labels, subtask progress, priority levels, assignee tracking, overdue alerts. Board and list views.`;
  p += ` INTEGRATIONS: 30+ connections including Slack, Gmail, HubSpot, Notion, Google Drive, Stripe, Salesforce, LinkedIn, Zoom, GitHub, Jira, QuickBooks. Auto-syncs records and automates actions across all connected tools.`;
  p += ` SYNC AI: Voice and text assistant spanning all 13 modules with 51 actions. Persistent memory, multi-step workflows, natural language commands. Can create invoices, find prospects, draft emails, schedule tasks — all from conversation.`;
  p += ` SUB-PAGES: Each module has dedicated sub-pages for deeper exploration. When the user wants to go deeper into a specific area, navigate to the sub-page:`;
  p += ` Finance sub-pages: finance-invoices (invoice list/management), finance-proposals (create/track proposals), finance-expenses (expense tracking vs budget), finance-ledger (general ledger/chart of accounts), finance-payables (AP aging/vendor payments), finance-reports (P&L, balance sheet, cash flow reports).`;
  p += ` Growth sub-pages: growth-pipeline (detailed kanban pipeline board), growth-campaigns (outbound campaign management), growth-signals (customer buying signals), growth-opportunities (opportunity tracking/forecast).`;
  p += ` CRM sub-pages: crm-leads (lead scoring/management), crm-prospects (prospect enrichment pipeline), crm-customers (customer health monitoring), crm-companies (company intelligence profiles).`;
  p += ` Talent sub-pages: talent-candidates (AI-matched candidate database), talent-projects (recruitment projects/open roles), talent-campaigns (outreach campaign analytics), talent-nests (candidate pool marketplace), talent-outreach (multi-channel SMS/email outreach).`;
  p += ` Learn sub-pages: learn-courses (course catalog/enrollment), learn-skills (team skill competency matrix), learn-builder (custom course creation), learn-certifications (verified certification tracking).`;
  p += ` Create sub-pages: create-branding (brand kit with colors/fonts/logo), create-images (AI image generation), create-videos (AI video creation), create-library (asset library/storage).`;
  p += ` Products sub-pages: products-digital (SaaS/license products), products-physical (physical goods/SKUs), products-shipping (shipment tracking), products-receiving (supplier receiving/QC), products-inventory (stock levels/reorder alerts).`;
  p += ` Raise sub-pages: raise-investors (investor pipeline/database), raise-pitchdecks (pitch deck analytics), raise-dataroom (encrypted document sharing), raise-campaigns (investor outreach).`;
  p += ` Sentinel sub-pages: sentinel-systems (AI system inventory/classification), sentinel-roadmap (compliance milestones/deadlines), sentinel-documents (generate Annex IV docs/conformity declarations).`;
  p += ` Sync sub-pages: sync-agent (SYNC AI chat interface), sync-activity (action history/analytics).`;

  // Navigation + highlight actions with examples
  p += ` Action tags — include EXACTLY these in your reply text (no extra words in the tag):`;
  p += ` [DEMO_ACTION: navigate_to PAGE_KEY] = jump to a module or sub-page. PAGE_KEY must be EXACTLY one of: dashboard, growth, crm, talent, finance, learn, create, products, raise, sentinel, inbox, tasks, integrations, sync-showcase, finance-invoices, finance-proposals, finance-expenses, finance-ledger, finance-payables, finance-reports, growth-pipeline, growth-campaigns, growth-signals, growth-opportunities, crm-leads, crm-prospects, crm-customers, crm-companies, talent-candidates, talent-projects, talent-campaigns, talent-nests, talent-outreach, learn-courses, learn-skills, learn-builder, learn-certifications, create-branding, create-images, create-videos, create-library, products-digital, products-physical, products-shipping, products-receiving, products-inventory, raise-investors, raise-pitchdecks, raise-dataroom, raise-campaigns, sentinel-systems, sentinel-roadmap, sentinel-documents, sync-agent, sync-activity. Use ONLY the exact key, never add extra words.`;
  p += ` [DEMO_ACTION: navigate_next] = advance to the next scripted step.`;
  p += ` [DEMO_ACTION: highlight SELECTOR] = spotlight a specific section on the current page. SELECTOR matches data-demo attributes.`;
  p += ` [DEMO_ACTION: schedule_call] = end demo and show booking screen.`;

  // Highlight selectors per page for interactive walkthroughs
  p += ` Available highlight selectors per page:`;
  p += ` dashboard: stats, pipeline, finance, learn, sentinel, raise, activity, quick-actions, team.`;
  p += ` growth: pipeline-stats, conversion-funnel, revenue-trend, pipeline, campaigns, growth-signals.`;
  p += ` crm: contact-stats, contacts, pagination, contact-intel.`;
  p += ` talent: talent-stats, response-ring, pipeline-stages, candidates, campaigns, intelligence-dist.`;
  p += ` finance: finance-stats, revenue-expense-chart, pnl-summary, invoices, ap-aging, upcoming-bills.`;
  p += ` learn: progress-overview, learn-stats, courses, skills, heatmap, leaderboard, certifications.`;
  p += ` create: tools, tabs, gallery, brand-assets, recent-prompts.`;
  p += ` products: product-stats, category-tabs, products, quick-actions, alerts.`;
  p += ` raise: raise-progress, raise-stats, investors, data-room, meetings, round-summary.`;
  p += ` sentinel: compliance, sentinel-stats, workflow, risk-chart, systems, obligations, documents.`;
  p += ` inbox: channels, messages, thread.`;
  p += ` tasks: task-stats, task-board.`;
  p += ` integrations: integration-stats, category-tabs, integrations, connected-stats.`;
  p += ` Sub-page highlight selectors:`;
  p += ` finance-invoices: invoices-list. finance-proposals: proposals-list. finance-expenses: expenses-list. finance-ledger: ledger. finance-payables: payables-list. finance-reports: reports-grid.`;
  p += ` growth-pipeline: pipeline-board. growth-campaigns: campaigns-list. growth-signals: signals-feed. growth-opportunities: opportunities-table.`;
  p += ` crm-leads: leads-table. crm-prospects: prospects-grid. crm-customers: customers-table. crm-companies: companies-grid.`;
  p += ` talent-candidates: candidates-table. talent-projects: projects-grid. talent-campaigns: talent-campaigns. talent-nests: nests-marketplace. talent-outreach: outreach-messages.`;
  p += ` learn-courses: course-catalog. learn-skills: skills-matrix. learn-builder: course-builder. learn-certifications: certifications-grid.`;
  p += ` create-branding: brand-kit. create-images: image-generator. create-videos: video-generator. create-library: asset-library.`;
  p += ` products-digital: digital-products. products-physical: physical-products. products-shipping: shipping-table. products-receiving: receiving-log. products-inventory: inventory-table.`;
  p += ` raise-investors: investor-pipeline. raise-pitchdecks: pitch-decks. raise-dataroom: data-room. raise-campaigns: raise-campaigns.`;
  p += ` sentinel-systems: ai-systems. sentinel-roadmap: compliance-roadmap. sentinel-documents: sentinel-documents.`;
  p += ` sync-agent: sync-agent. sync-activity: sync-activity.`;

  // Interactive use-case instructions
  p += ` INTERACTIVE WALKTHROUGHS: When explaining a module, walk through a concrete use case by highlighting specific sections as you explain them. For example on the growth page: "Let's say ${company} just got a hot inbound lead. [DEMO_ACTION: highlight pipeline] You'd see them appear right here in your pipeline. As your team qualifies them, just drag the card to the next stage. [DEMO_ACTION: highlight conversion-funnel] And this funnel shows you exactly where deals tend to stall, so you can coach your team on the right actions." On finance: "Imagine ${company} just closed a deal. [DEMO_ACTION: highlight invoices] You'd create the invoice right from this table — client info pulls in automatically from your CRM. [DEMO_ACTION: highlight pnl-summary] And it immediately flows into your P&L so you've got a real-time picture of profitability." Do this naturally, weaving highlights into your explanation. Don't just describe — point to specific parts of the screen as you talk.`;

  p += ` Navigation examples: User asks "what about finance?" → "Let me show you finance. [DEMO_ACTION: navigate_to finance] Here you can see..." User asks "show me sentinel" → "Absolutely. [DEMO_ACTION: navigate_to sentinel] This is our compliance module..."`;
  p += ` CRITICAL: You are on "${currentPage}". If you discuss any other module, you MUST include [DEMO_ACTION: navigate_to PAGE_KEY] with EXACTLY the page key keyword — no extra words.`;

  // Objection handling + competitive positioning
  p += ` OBJECTION HANDLING: When ${name} raises concerns, address them naturally:`;
  p += ` "We already use Salesforce/HubSpot/other CRM" → "Totally understand — most teams we work with started there too. The difference is iSyncso connects your CRM data to your finance, tasks, hiring, and compliance in one view. So when a deal closes in Growth, the invoice auto-generates in Finance, and an onboarding task kicks off in Tasks. No integrations to maintain, no data silos. That cross-module intelligence is what makes teams move faster."`;
  p += ` "This seems expensive / what's the pricing" → "Great question. Most teams actually save money because they're replacing 4-5 separate tools — a CRM, project manager, invoicing tool, learning platform, and compliance tracker. One platform means one subscription, one login, one source of truth. We can run through the numbers specific to ${company} on a follow-up call."`;
  p += ` "We're too small for this" → "Actually, growing teams get the most value here because you're building on a unified foundation from day one. No painful migrations later, no data spread across 10 different tools. Teams of 5-10 people use iSyncso every day."`;
  p += ` "We're too big / enterprise needs" → "iSyncso is built for scale — role-based access, department-level permissions, compliance tracking, and audit trails. Our Sentinel module alone handles EU AI Act compliance that enterprise teams are scrambling to figure out."`;
  p += ` "How is this different from X?" → "The core difference is that iSyncso is one unified platform, not a bundle of disconnected tools. When you close a deal, that data flows into finance, triggers tasks, and updates dashboards — automatically. No Zapier glue, no sync issues, no data living in three different places."`;

  // Cross-module narratives for weaving compelling stories
  p += ` CROSS-MODULE STORIES: When natural, connect features across modules: "Close a deal in Growth, the invoice auto-creates in Finance, and a task gets assigned in Tasks for onboarding." "A candidate in Talent can be enriched with company intel from CRM, and when they join, they're auto-enrolled in Learn courses." "Sentinel tracks the AI systems registered across all modules, so compliance is built into the workflow, not bolted on."`;

  return p;
}

// =============================================================================
// TTS
// =============================================================================

// Voice mappings per TTS model — Kokoro uses different voice IDs than Orpheus
const ORPHEUS_DEFAULT_VOICE = 'tara';
const KOKORO_DEFAULT_VOICE = 'af_heart'; // Warm feminine voice, best for demo AE persona
const ORPHEUS_VOICES = ['tara', 'leah', 'jess', 'leo'];
const KOKORO_VOICES = ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'am_adam', 'am_echo'];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateTTS(text: string, orpheusVoice: string): Promise<{ audio: string; byteLength: number }> {
  // Try Kokoro first (97ms TTFB vs 187ms Orpheus)
  try {
    const response = await fetch('https://api.together.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'hexgrad/Kokoro-82M',
        input: text,
        voice: KOKORO_DEFAULT_VOICE,
        response_format: 'mp3',
      }),
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return { audio: arrayBufferToBase64(buffer), byteLength: buffer.byteLength };
    }
    // Kokoro failed — fall through to Orpheus
    console.log(`[voice-demo] Kokoro TTS failed (${response.status}), falling back to Orpheus`);
  } catch (e) {
    console.log('[voice-demo] Kokoro TTS error, falling back to Orpheus');
  }

  // Fallback: Orpheus with original voice names
  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice: orpheusVoice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return { audio: arrayBufferToBase64(buffer), byteLength: buffer.byteLength };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      message,
      history = [],
      demoToken,
      stepContext,
      voice: requestedVoice,
      ttsOnly = false,
      ttsText,
    } = body;

    const voice = ORPHEUS_VOICES.includes(requestedVoice) ? requestedVoice : ORPHEUS_DEFAULT_VOICE;

    // TTS-only mode (for scripted dialogue)
    if (ttsOnly && ttsText) {
      try {
        const ttsResult = await generateTTS(ttsText, voice);
        return new Response(
          JSON.stringify({ audio: ttsResult.audio, audioFormat: 'mp3' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (_) {
        return new Response(
          JSON.stringify({ audio: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const startTime = Date.now();

    // Fetch demo link (for name/company) — only select what we need
    let recipientName = 'there';
    let companyName = 'your company';
    let demoLinkId: string | null = null;

    if (demoToken) {
      // Non-blocking: start fetch but don't wait if it's slow
      const linkPromise = supabase
        .from('demo_links')
        .select('id, recipient_name, company_name')
        .eq('token', demoToken)
        .single();

      // Give it 300ms max — if DB is slow, use defaults
      const result = await Promise.race([
        linkPromise,
        new Promise<null>(r => setTimeout(() => r(null), 300)),
      ]) as { data: Record<string, unknown> } | null;

      if (result?.data) {
        recipientName = (result.data.recipient_name as string) || recipientName;
        companyName = (result.data.company_name as string) || companyName;
        demoLinkId = result.data.id as string;
      }
    }

    // Build compact messages — only use client-side history (skip DB session)
    const systemPrompt = buildSystemPrompt(recipientName, companyName, stepContext);
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Last 12 history messages for richer conversational context
    for (const msg of history.slice(-12)) {
      if (msg.role && msg.content) messages.push(msg);
    }
    messages.push({ role: 'user', content: message });

    // LLM call with streaming — accumulate until first sentence, start TTS early
    const llmStart = Date.now();
    const llmResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages,
        temperature: 0.5,
        max_tokens: 200,
        stream: true,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    // Stream tokens and split at first sentence boundary for early TTS
    let fullText = '';
    let firstSentence = '';
    let firstSentenceTtsPromise: Promise<{ audio: string; byteLength: number } | null> | null = null;
    const sentenceEndRegex = /[.!?]\s/;

    const reader = llmResponse.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const token = json.choices?.[0]?.delta?.content || '';
          if (token) {
            fullText += token;

            // Once we have a complete first sentence, fire TTS immediately
            if (!firstSentence && sentenceEndRegex.test(fullText)) {
              const match = fullText.match(/^(.*?[.!?])\s/);
              if (match) {
                firstSentence = match[1];
                const firstSpoken = firstSentence.replace(/\[DEMO_ACTION:\s*[^\]]+\]/g, '').trim();
                if (firstSpoken) {
                  firstSentenceTtsPromise = generateTTS(firstSpoken, voice).catch(() => null);
                  console.log(`[voice-demo] ${Date.now() - llmStart}ms → first sentence TTS fired`);
                }
              }
            }
          }
        } catch (_) {}
      }
    }

    const llmTime = Date.now() - llmStart;

    // Clean up response
    let responseText = fullText || "I'm here! What would you like to know?";
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    console.log(`[voice-demo] ${llmTime}ms LLM — "${responseText.substring(0, 60)}"`);

    // Strip action tags from TTS text (keep in response for client parsing)
    const spokenText = responseText.replace(/\[DEMO_ACTION:\s*[^\]]+\]/g, '').trim();

    // Use first-sentence TTS if available, otherwise generate full TTS
    let ttsPromise: Promise<{ audio: string; byteLength: number } | null>;
    if (firstSentenceTtsPromise) {
      // Already started TTS for first sentence — now also generate full audio
      // Return whichever finishes: prefer full audio if first-sentence TTS is slow
      ttsPromise = Promise.race([
        firstSentenceTtsPromise,
        spokenText ? generateTTS(spokenText, voice).catch(() => null) : Promise.resolve(null),
      ]);
    } else {
      ttsPromise = spokenText ? generateTTS(spokenText, voice).catch(() => null) : Promise.resolve(null);
    }

    // Fire-and-forget: save conversation log
    if (demoLinkId) {
      supabase.rpc('append_demo_conversation', {
        p_demo_link_id: demoLinkId,
        p_user_msg: message,
        p_assistant_msg: responseText,
      }).then(() => {}).catch(() => {});
    }

    // Wait for TTS
    const ttsResult = await ttsPromise;
    const totalTime = Date.now() - startTime;
    console.log(`[voice-demo] ${totalTime}ms total (llm=${llmTime}ms)`);

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        audio: ttsResult?.audio || null,
        audioFormat: ttsResult ? 'mp3' : undefined,
        timing: { total: totalTime, llm: llmTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[voice-demo] Error:', error);
    return new Response(
      JSON.stringify({
        text: "Sorry, could you say that again?",
        response: "Sorry, could you say that again?",
        audio: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
