/**
 * SYNC Voice API
 * Real-time voice conversation endpoint with Cartesia Sonic TTS
 *
 * Flow:
 * 1. Receives transcribed text from client (browser STT)
 * 2. Processes with SYNC LLM (Kimi-K2)
 * 3. Generates speech with Cartesia Sonic (90ms TTFA)
 * 4. Returns audio for playback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Available TTS voices via Together.ai
// Using Orpheus model voices (confirmed working)
const VOICES = {
  tara: 'tara',     // Female, friendly
  leah: 'leah',     // Female
  jess: 'jess',     // Female
  leo: 'leo',       // Male
  dan: 'dan',       // Male
  mia: 'mia',       // Female
  zac: 'zac',       // Male
  zoe: 'zoe',       // Female
};

// Conversational system prompt optimized for voice
const VOICE_SYSTEM_PROMPT = `You are SYNC, a friendly AI assistant for iSyncSO. You're having a real-time voice conversation.

CRITICAL VOICE RULES:
- Keep responses SHORT and conversational (1-3 sentences max)
- Be warm, natural, and engaging
- Never use markdown, bullet points, or formatting
- Speak like a helpful colleague, not a robot
- If asked to do something complex, briefly acknowledge and say you'll handle it
- Use contractions naturally (I'm, you're, let's, etc.)
- Avoid technical jargon unless the user uses it first

Examples of good voice responses:
- "Sure, I'll create that invoice for you right now."
- "Got it! I found 3 products matching that search."
- "I've added that task to your list. Anything else?"

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

// Simple LLM call for voice (faster, more concise)
async function getVoiceResponse(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: { userId?: string; companyId?: string }
): Promise<string> {
  const messages = [
    { role: 'system', content: VOICE_SYSTEM_PROMPT },
    ...conversationHistory.slice(-6), // Keep last 3 exchanges for context
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.together.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshotai/Kimi-K2-Instruct',
      messages,
      max_tokens: 150, // Keep responses short for voice
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LLM error:', error);
    throw new Error('Failed to get response');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "I'm here to help!";
}

// Generate speech with Together.ai TTS (Orpheus model - fast and natural)
async function generateSpeech(
  text: string,
  voice: string = 'tara'
): Promise<ArrayBuffer> {
  console.log(`Generating speech for: "${text.substring(0, 50)}..." with voice: ${voice}`);

  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice: voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS error:', error);
    throw new Error(`TTS failed: ${error}`);
  }

  return await response.arrayBuffer();
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      message,
      sessionId,
      conversationHistory = [],
      voice: requestedVoice,
      context = {}
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate voice - use default if invalid
    const validVoices = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];
    const voice = validVoices.includes(requestedVoice) ? requestedVoice : 'tara';

    console.log(`[sync-voice] Processing: "${message.substring(0, 50)}..." with voice: ${voice}`);
    const startTime = Date.now();

    // Get LLM response (optimized for voice)
    const llmStart = Date.now();
    const responseText = await getVoiceResponse(message, conversationHistory, context);
    console.log(`[sync-voice] LLM response in ${Date.now() - llmStart}ms: "${responseText.substring(0, 50)}..."`);

    // Generate speech with Together.ai TTS
    const ttsStart = Date.now();
    const audioBuffer = await generateSpeech(responseText, voice);
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    console.log(`[sync-voice] TTS generated in ${Date.now() - ttsStart}ms (${audioBuffer.byteLength} bytes)`);

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total processing time: ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        text: responseText,
        audio: audioBase64,
        audioFormat: 'mp3',
        timing: {
          total: totalTime,
          llm: Date.now() - llmStart - (Date.now() - ttsStart),
          tts: Date.now() - ttsStart,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('[sync-voice] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        text: "Sorry, I couldn't process that. Could you try again?"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
