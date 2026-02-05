/**
 * SYNC Voice API v3 — Direct LLM + TTS (no /sync proxy)
 *
 * Calls Together.ai LLM directly with a voice-optimized prompt,
 * then generates TTS audio. No session loading, no memory RAG,
 * no routing — pure speed for conversational voice.
 *
 * Target latency: 2-4 seconds total.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

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
    console.log(`[sync-voice] "${message.substring(0, 50)}..." voice=${voice}`);

    // Build messages array: system + recent history + current message
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: VOICE_SYSTEM_PROMPT },
    ];

    // Add conversation history (last few turns from client)
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
