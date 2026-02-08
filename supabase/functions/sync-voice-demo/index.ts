/**
 * SYNC Voice Demo API — Ultra-fast public demo voice assistant
 *
 * Optimized for speed:
 * - 8B model for sub-second LLM responses
 * - Minimal system prompt (fewer input tokens = faster TTFT)
 * - Parallel DB lookups + TTS
 * - max_tokens: 35 for punchy, human-like replies
 * - Client history only (no server-side session lookup on hot path)
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
  let p = `You are SYNC, a friendly AI sales rep demoing iSyncso for ${name} at ${company}. Reply in 1-2 short spoken sentences. Use contractions. No markdown, no lists, no emojis. Sound natural and warm like a real person on a call.`;

  if (stepContext?.page_key) {
    p += ` You're currently showing the ${stepContext.page_key} page.`;
  }

  // Module knowledge so Sync can freestyle about any topic
  p += ` iSyncso modules: dashboard (KPIs, activity feed), growth (sales pipeline, deals, campaigns), crm (contacts, enrichment, company intel), talent (recruiting, candidates, AI matching, outreach), finance (invoices, proposals, expenses, revenue), learn (courses, learning paths, team training), create (AI image/video generation, content studio), products (catalog, inventory, pricing, variants), raise (fundraising, investor pipeline, data room), sentinel (EU AI Act compliance, risk assessment), inbox (unified messaging across channels), tasks (AI-prioritized task management), integrations (30+ third-party apps like Slack, HubSpot, Gmail).`;

  // Navigation actions — Sync can jump to ANY page
  p += ` Actions: To move to next step say [DEMO_ACTION: navigate_next]. To jump to a specific module say [DEMO_ACTION: navigate_to PAGE_KEY] where PAGE_KEY is one of: dashboard, growth, crm, talent, finance, learn, create, products, raise, sentinel, inbox, tasks, integrations. To book a call say [DEMO_ACTION: schedule_call]. When the user asks about a different module, navigate there and explain it. Always include the action tag when navigating.`;

  return p;
}

// =============================================================================
// TTS
// =============================================================================

const DEFAULT_VOICE = 'tara';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateTTS(text: string, voice: string): Promise<{ audio: string; byteLength: number }> {
  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice,
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

    const voice = requestedVoice === 'tara' || requestedVoice === 'leah' || requestedVoice === 'jess' || requestedVoice === 'leo' ? requestedVoice : DEFAULT_VOICE;

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

    // Only last 4 history messages to keep input tokens minimal
    for (const msg of history.slice(-4)) {
      if (msg.role && msg.content) messages.push(msg);
    }
    messages.push({ role: 'user', content: message });

    // LLM call — 8B turbo for speed, 50 tokens for complete short replies
    const llmStart = Date.now();
    const llmResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages,
        temperature: 0.5,
        max_tokens: 80,
        stream: false,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    let responseText = llmData.choices?.[0]?.message?.content || "I'm here! What would you like to know?";
    const llmTime = Date.now() - llmStart;

    // Strip any markdown that slipped through
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    console.log(`[voice-demo] ${llmTime}ms LLM — "${responseText.substring(0, 60)}"`);

    // Strip action tags from TTS text (keep in response for client parsing)
    const spokenText = responseText.replace(/\[DEMO_ACTION:\s*[^\]]+\]/g, '').trim();

    // Start TTS immediately (parallel with log saves)
    const ttsPromise = spokenText ? generateTTS(spokenText, voice).catch(() => null) : Promise.resolve(null);

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
