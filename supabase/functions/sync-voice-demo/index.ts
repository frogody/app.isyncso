/**
 * SYNC Voice Demo API — Public demo voice assistant (no JWT)
 *
 * Forked from sync-voice/index.ts with key differences:
 * - No auth required — operates with demoToken
 * - System prompt is an Account Executive demo persona
 * - Parses [DEMO_ACTION: ...] tags for orchestration
 * - Session key: demo_{token}
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
// DEMO VOICE SYSTEM PROMPT
// =============================================================================

function buildDemoSystemPrompt(demoLink: Record<string, unknown> | null, stepContext: Record<string, unknown> | null): string {
  const recipientName = (demoLink?.recipient_name as string) || 'there';
  const companyName = (demoLink?.company_name as string) || 'your company';
  const industry = (demoLink?.company_context as Record<string, unknown>)?.industry || '';
  const notes = (demoLink?.company_context as Record<string, unknown>)?.notes || '';

  let prompt = `You are SYNC, an AI Account Executive giving a personalized demo of iSyncso — an AI-powered business platform.

PROSPECT INFO:
- Name: ${recipientName}
- Company: ${companyName}
${industry ? `- Industry: ${industry}` : ''}
${notes ? `- Notes: ${notes}` : ''}

YOUR PERSONALITY:
- Warm, confident, and enthusiastic — like a top AE who genuinely loves the product
- Use the prospect's first name naturally
- Frame every feature as a business outcome for their specific company
- Keep responses under 3 sentences — this is a voice conversation, not a pitch deck
- Use contractions: I'm, you're, let's, that's, we've
- NO markdown, bullets, lists, bold, or formatting
- NO emojis or special characters

DEMO FLOW:
- You're walking the prospect through a live demo of iSyncso
- Guide them through features, highlighting what matters for their business
- If they ask a question, answer it naturally, then steer back to the demo
- If they seem ready to move on, you can suggest advancing: [DEMO_ACTION: navigate_next]

DEMO ACTIONS:
- When you want the demo to advance to the next step, include: [DEMO_ACTION: navigate_next]
- When you want to highlight a specific feature, include: [DEMO_ACTION: highlight feature-name]
- When the prospect wants to schedule a call, include: [DEMO_ACTION: schedule_call]
- Actions are parsed and removed before the text is spoken — they're invisible to the prospect

CONVERSATION HANDLING:
- If the prospect asks about pricing, say something like "Pricing depends on your team size and modules. Let's schedule a call after the demo to discuss what makes sense for ${companyName}."
- If they ask a technical question you're unsure about, say "Great question — I'll make sure our solutions team covers that in your follow-up call."
- Always be honest — don't make up features or capabilities`;

  if (stepContext) {
    prompt += `\n\nCURRENT DEMO STEP:
- Step Title: ${stepContext.title || 'N/A'}
- Page: ${stepContext.page_key || 'N/A'}
- Script: ${stepContext.dialogue || 'N/A'}
- You just spoke about this. If the user asks a related question, answer in context.`;
  }

  return prompt;
}

// =============================================================================
// SESSION MEMORY (keyed by demo token)
// =============================================================================

async function getDemoSession(token: string): Promise<{
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
}> {
  const sessionId = `demo_${token}`;

  const { data: existing } = await supabase
    .from('sync_sessions')
    .select('session_id, messages')
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    return { sessionId: existing.session_id, messages: existing.messages || [] };
  }

  await supabase
    .from('sync_sessions')
    .insert({
      session_id: sessionId,
      messages: [],
      conversation_summary: null,
      active_entities: {},
      context: { type: 'demo', token },
      last_agent: 'sync-voice-demo',
      total_messages: 0,
    });

  return { sessionId, messages: [] };
}

function saveDemoSession(sessionId: string, messages: Array<{ role: string; content: string }>) {
  const trimmed = messages.slice(-20);
  supabase
    .from('sync_sessions')
    .update({
      messages: trimmed,
      total_messages: trimmed.length,
      last_agent: 'sync-voice-demo',
      last_activity: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .then(({ error }) => {
      if (error) console.error('[sync-voice-demo] Session save error:', error.message);
    });
}

// =============================================================================
// TTS
// =============================================================================

const VALID_VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];
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

    // TTS-only mode
    if (ttsOnly && ttsText) {
      const voice = VALID_VOICES.includes(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
      const ttsStart = Date.now();
      try {
        const ttsResult = await generateTTS(ttsText, voice);
        console.log(`[sync-voice-demo] TTS-only: ${Date.now() - ttsStart}ms, ${ttsResult.byteLength} bytes`);
        return new Response(
          JSON.stringify({ audio: ttsResult.audio, audioFormat: 'mp3' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (err) {
        console.error('[sync-voice-demo] TTS-only failed:', err);
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

    const voice = VALID_VOICES.includes(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const startTime = Date.now();

    // Load demo link data for context
    let demoLink: Record<string, unknown> | null = null;
    if (demoToken) {
      const { data } = await supabase
        .from('demo_links')
        .select('*')
        .eq('token', demoToken)
        .single();
      demoLink = data;
    }

    // Load or create session
    let session: { sessionId: string; messages: Array<{ role: string; content: string }> } | null = null;
    if (demoToken) {
      try {
        session = await getDemoSession(demoToken);
      } catch (_) { /* non-critical */ }
    }

    // Build messages for LLM
    const systemPrompt = buildDemoSystemPrompt(demoLink, stepContext);
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add persisted session messages
    if (session?.messages?.length) {
      for (const msg of session.messages.slice(-6)) {
        if (msg.role && msg.content) messages.push(msg);
      }
    }

    // Add client-side history
    for (const msg of history) {
      if (msg.role && msg.content) messages.push(msg);
    }

    messages.push({ role: 'user', content: message });

    // LLM call — use fast turbo model with tight token limit for voice
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
        temperature: 0.6,
        max_tokens: 80,
        stream: false,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    let responseText = llmData.choices?.[0]?.message?.content || "Hey, I'm here! Ask me anything about iSyncso.";
    const llmTime = Date.now() - llmStart;

    // Strip accidental markdown
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    console.log(`[sync-voice-demo] LLM: ${llmTime}ms — "${responseText.substring(0, 80)}" token=${demoToken?.substring(0, 8)}`);

    // Generate TTS in parallel with session/log saves (single round-trip for client)
    const ttsPromise = generateTTS(responseText, voice).catch((err) => {
      console.warn('[sync-voice-demo] Inline TTS failed:', err.message);
      return null;
    });

    // Save to session (fire-and-forget)
    if (session) {
      const updatedMessages = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      saveDemoSession(session.sessionId, updatedMessages);
    }

    // Append to conversation_log (fire-and-forget)
    if (demoLink?.id) {
      const existingLog = (demoLink.conversation_log as Array<unknown>) || [];
      supabase
        .from('demo_links')
        .update({
          conversation_log: [
            ...existingLog,
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: responseText, timestamp: new Date().toISOString() },
          ],
        })
        .eq('id', demoLink.id)
        .then(() => {});
    }

    // Wait for TTS to finish
    const ttsResult = await ttsPromise;
    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice-demo] Total: ${totalTime}ms (llm=${llmTime}ms, tts=${ttsResult ? 'ok' : 'skip'})`);

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        audio: ttsResult?.audio || null,
        audioFormat: ttsResult ? 'mp3' : undefined,
        mood: 'neutral',
        timing: { total: totalTime, llm: llmTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[sync-voice-demo] Error:', error);

    const errorText = "Sorry, I had a hiccup. Could you say that again?";
    let errorAudio = '';
    try {
      const tts = await generateTTS(errorText, DEFAULT_VOICE);
      errorAudio = tts.audio;
    } catch (_) { /* silent */ }

    return new Response(
      JSON.stringify({
        text: errorText,
        response: errorText,
        audio: errorAudio || undefined,
        audioFormat: errorAudio ? 'mp3' : undefined,
        mood: 'neutral',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
