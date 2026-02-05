/**
 * SYNC Voice API v5 — Fast voice + background actions + persistent memory
 *
 * Two-path architecture:
 * 1. FAST PATH (all messages): Direct LLM → TTS → respond in 2-4s
 * 2. ACTION PATH (when needed): /sync fires in background for real execution
 *
 * Every response feels instant. Actions execute asynchronously.
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
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =============================================================================
// VOICE SYSTEM PROMPT
// =============================================================================

const VOICE_SYSTEM_PROMPT = `You are SYNC, a voice assistant for iSyncSO. You're in a real-time voice conversation.

RULES:
- Reply in 1-2 short sentences max. Think "phone call", not "email".
- Use contractions: I'm, you're, let's, that's, don't, won't.
- NO markdown, bullets, lists, bold, headers, or formatting of any kind.
- NO emojis or special characters.
- Be warm, natural, and conversational — like a smart colleague.
- If asked a greeting, just greet back naturally.
- Numbers spoken naturally: "about twelve hundred" not "1,247".
- Ask follow-up questions to keep the conversation flowing.

ACCURACY:
- NEVER invent or fabricate company names, emails, people, numbers, or data.
- Only reference information explicitly mentioned in the conversation.
- If you don't know something, say so honestly.

ACTIONS:
- You CAN perform business actions like sending emails, creating invoices, looking up data, managing tasks, and more.
- When the user asks you to do something, confirm briefly and naturally, like "Sure, I'll create that invoice for you now" or "Got it, looking that up".
- Keep the confirmation short — the action happens in the background.`;

// =============================================================================
// ACTION DETECTION — keyword-based, zero latency
// =============================================================================

const ACTION_VERBS = [
  'send', 'create', 'make', 'add', 'delete', 'remove', 'update', 'change',
  'look up', 'lookup', 'find', 'search', 'check', 'show me', 'list',
  'schedule', 'assign', 'complete', 'generate', 'set up', 'configure',
  'connect', 'move', 'mark', 'cancel', 'approve', 'reject', 'invite',
];

const ACTION_NOUNS = [
  'invoice', 'email', 'task', 'proposal', 'expense', 'product', 'team',
  'campaign', 'prospect', 'client', 'contact', 'message', 'meeting',
  'report', 'image', 'course', 'conversation', 'pipeline',
];

function isActionRequest(msg: string): boolean {
  const lower = msg.toLowerCase();
  const hasVerb = ACTION_VERBS.some(v => lower.includes(v));
  const hasNoun = ACTION_NOUNS.some(n => lower.includes(n));
  // Need both an action verb AND a business noun to trigger action path
  return hasVerb && hasNoun;
}

// =============================================================================
// SESSION MEMORY
// =============================================================================

const VOICE_SESSION_PREFIX = 'voice_';

async function getVoiceSession(userId: string): Promise<{
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  summary: string | null;
}> {
  const sessionId = `${VOICE_SESSION_PREFIX}${userId}`;

  const { data: existing } = await supabase
    .from('sync_sessions')
    .select('session_id, messages, conversation_summary')
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    return {
      sessionId: existing.session_id,
      messages: existing.messages || [],
      summary: existing.conversation_summary,
    };
  }

  const { error } = await supabase
    .from('sync_sessions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      messages: [],
      conversation_summary: null,
      active_entities: { clients: [], products: [], preferences: {}, current_intent: null },
      context: { type: 'voice' },
      last_agent: 'sync-voice',
      total_messages: 0,
    });

  if (error) console.error('[sync-voice] Session create error:', error.message);
  return { sessionId, messages: [], summary: null };
}

function saveToSession(sessionId: string, allMessages: Array<{ role: string; content: string }>) {
  const trimmed = allMessages.slice(-20);
  supabase
    .from('sync_sessions')
    .update({
      messages: trimmed,
      total_messages: trimmed.length,
      last_agent: 'sync-voice',
      last_activity: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .then(({ error }) => {
      if (error) console.error('[sync-voice] Session save error:', error.message);
    });
}

// =============================================================================
// BACKGROUND ACTION — fire /sync and save result to session
// =============================================================================

function fireBackgroundAction(
  message: string,
  userId: string,
  companyId: string | undefined,
  sessionId: string,
  sessionMessages: Array<{ role: string; content: string }>,
) {
  // Fire and forget — don't await
  (async () => {
    try {
      console.log(`[sync-voice] Background action: "${message.substring(0, 50)}..."`);
      const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message,
          sessionId,
          voice: true,
          stream: false,
          context: { userId, companyId },
        }),
      });

      if (!syncRes.ok) {
        console.error(`[sync-voice] Background action failed: ${syncRes.status}`);
        return;
      }

      const syncData = await syncRes.json();
      const actionResult = syncData.response || syncData.text || '';
      console.log(`[sync-voice] Background action done: "${actionResult.substring(0, 80)}"`);

      // Save the action result to session so next voice turn has context
      if (actionResult) {
        const updatedMessages = [
          ...sessionMessages,
          { role: 'system', content: `[Action completed]: ${actionResult}` },
        ];
        saveToSession(sessionId, updatedMessages);
      }
    } catch (e) {
      console.error('[sync-voice] Background action error:', e);
    }
  })();
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

async function generateTTS(
  text: string,
  voice: string,
): Promise<{ audio: string; byteLength: number }> {
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
    const {
      message,
      history = [],
      userId,
      companyId,
      voiceConfig,
      voice: requestedVoice,
      skipTTS = false,
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const voice = VALID_VOICES.includes(requestedVoice || voiceConfig?.voice)
      ? (requestedVoice || voiceConfig?.voice)
      : DEFAULT_VOICE;

    const startTime = Date.now();
    const needsAction = isActionRequest(message);
    console.log(`[sync-voice] "${message.substring(0, 50)}..." voice=${voice} action=${needsAction} userId=${userId?.substring(0, 8) || 'anon'}`);

    // Load session (fast — single row lookup by exact ID)
    let session: { sessionId: string; messages: Array<{ role: string; content: string }>; summary: string | null } | null = null;
    if (userId) {
      try {
        session = await getVoiceSession(userId);
      } catch (_) { /* non-critical */ }
    }

    // Build LLM messages: system + DB context + client history + current
    let systemPrompt = VOICE_SYSTEM_PROMPT;
    if (session?.summary) {
      systemPrompt += `\n\nPREVIOUS CONVERSATION SUMMARY:\n${session.summary}`;
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add persisted messages (last 6 from DB)
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

    // Fast LLM call — always runs, gives instant conversational response
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
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`LLM error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    let responseText = llmData.choices?.[0]?.message?.content || "Hey, I'm here!";
    const llmTime = Date.now() - llmStart;

    // Strip accidental markdown
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    console.log(`[sync-voice] LLM: ${llmTime}ms — "${responseText.substring(0, 80)}" action=${needsAction}`);

    // Fire background action BEFORE TTS (maximize parallelism)
    if (needsAction && userId && session) {
      const messagesForAction = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      fireBackgroundAction(message, userId, companyId, session.sessionId, messagesForAction);
    }

    // Generate TTS
    let audio = '';
    let ttsTime = 0;

    if (!skipTTS && responseText.length > 0) {
      const ttsStart = Date.now();
      try {
        const ttsResult = await generateTTS(responseText, voice);
        audio = ttsResult.audio;
        ttsTime = Date.now() - ttsStart;
        console.log(`[sync-voice] TTS: ${ttsTime}ms, ${ttsResult.byteLength} bytes`);
      } catch (err) {
        console.error('[sync-voice] TTS failed:', err);
        ttsTime = Date.now() - ttsStart;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total: ${totalTime}ms (llm=${llmTime}ms tts=${ttsTime}ms)`);

    // Save to session (fire-and-forget)
    if (session) {
      const updatedMessages = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      saveToSession(session.sessionId, updatedMessages);
    }

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        audio: audio || undefined,
        audioFormat: audio ? 'mp3' : undefined,
        mood: 'neutral',
        actionPending: needsAction,
        timing: { total: totalTime, llm: llmTime, tts: ttsTime },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[sync-voice] Error:', error);

    const errorText = "Sorry, something went wrong. Try that again?";
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
