/**
 * SYNC Voice API v4 — Direct LLM + TTS + Persistent Memory
 *
 * Calls Together.ai LLM directly with a voice-optimized prompt,
 * generates TTS audio, and persists conversation to sync_sessions.
 * Loads past conversation context so voice remembers across sessions.
 *
 * Target latency: 2-4 seconds total.
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
// VOICE SYSTEM PROMPT — kept minimal for speed
// =============================================================================

const VOICE_SYSTEM_PROMPT = `You are SYNC, a friendly AI assistant for a business platform called iSyncSO. You're in a real-time voice conversation.

RULES:
- Reply in 1-2 short sentences max. Think "phone call", not "email".
- Use contractions: I'm, you're, let's, that's, don't, won't.
- NO markdown, bullets, lists, bold, headers, or formatting of any kind.
- NO emojis or special characters.
- Be warm, natural, and conversational — like a smart colleague.
- If asked a greeting, just greet back naturally.
- Numbers spoken naturally: "about twelve hundred" not "1,247".
- Ask follow-up questions to keep the conversation flowing.`;

// =============================================================================
// SESSION MEMORY — load past context, save new messages
// =============================================================================

const VOICE_SESSION_PREFIX = 'voice_';

/** Get or create a voice session for this user */
async function getVoiceSession(userId: string): Promise<{
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  summary: string | null;
}> {
  // Look for the most recent voice session for this user
  const { data: existing } = await supabase
    .from('sync_sessions')
    .select('session_id, messages, conversation_summary')
    .eq('user_id', userId)
    .like('session_id', `${VOICE_SESSION_PREFIX}%`)
    .order('last_activity', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return {
      sessionId: existing.session_id,
      messages: existing.messages || [],
      summary: existing.conversation_summary,
    };
  }

  // Create a new voice session
  const sessionId = `${VOICE_SESSION_PREFIX}${userId.substring(0, 8)}`;
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

/** Save new messages to the session (fire-and-forget, don't block response) */
function saveToSession(sessionId: string, userMsg: string, assistantMsg: string, allMessages: Array<{ role: string; content: string }>) {
  // Keep only last 20 messages in the buffer
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
      else console.log(`[sync-voice] Saved ${trimmed.length} messages to ${sessionId}`);
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
    console.log(`[sync-voice] "${message.substring(0, 50)}..." voice=${voice} userId=${userId?.substring(0, 8) || 'anon'}`);

    // Load persistent session if userId provided (non-blocking parallel with nothing — just fast)
    let session: { sessionId: string; messages: Array<{ role: string; content: string }>; summary: string | null } | null = null;
    if (userId) {
      try {
        session = await getVoiceSession(userId);
        console.log(`[sync-voice] Session ${session.sessionId}: ${session.messages.length} past msgs, summary=${!!session.summary}`);
      } catch (e) {
        console.error('[sync-voice] Session load failed:', e);
      }
    }

    // Build messages array: system + past context + recent history + current message
    let systemPrompt = VOICE_SYSTEM_PROMPT;

    // Inject conversation summary if available (past sessions context)
    if (session?.summary) {
      systemPrompt += `\n\nCONVERSATION HISTORY SUMMARY (from previous conversations):\n${session.summary}`;
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add persisted session messages (last 6 from DB for context)
    if (session?.messages?.length) {
      const dbMessages = session.messages.slice(-6);
      for (const msg of dbMessages) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add client-side history (current session turns not yet saved)
    for (const msg of history) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: message });

    // Call LLM directly — fast turbo model, tiny max_tokens
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
    console.log(`[sync-voice] LLM: ${llmTime}ms — "${responseText.substring(0, 80)}"`);

    // Quick cleanup — strip any accidental markdown
    responseText = responseText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    // Generate TTS audio only if requested
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

    // Save to persistent session (fire-and-forget — doesn't block response)
    if (session) {
      const updatedMessages = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      saveToSession(session.sessionId, message, responseText, updatedMessages);
    }

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        audio: audio || undefined,
        audioFormat: audio ? 'mp3' : undefined,
        mood: 'neutral',
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
        audio: errorAudio,
        audioFormat: 'mp3',
        mood: 'neutral',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
