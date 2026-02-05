/**
 * SYNC Voice API - Voice Proxy to Main SYNC
 *
 * Proxies requests to the main /sync endpoint for full action support (51 actions),
 * then humanizes the response text and generates TTS audio.
 *
 * Flow:
 * 1. Detect user mood from message
 * 2. Call main /sync endpoint (LLM response + action execution)
 * 3. Humanize the response text for voice output
 * 4. Generate TTS audio via Orpheus-3B
 * 5. Return audio + text + action results
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// =============================================================================
// TYPES
// =============================================================================

type UserMood = 'excited' | 'stressed' | 'frustrated' | 'neutral' | 'happy' | 'rushed' | 'curious';

interface MoodAnalysis {
  mood: UserMood;
  confidence: number;
  responseStyle: string;
}

// =============================================================================
// MOOD DETECTION
// =============================================================================

function detectUserMood(message: string): MoodAnalysis {
  const lower = message.toLowerCase();

  if (/(!{2,}|amazing|awesome|great news|fantastic|yes!|perfect|love it|incredible)/i.test(message)) {
    return { mood: 'excited', confidence: 0.8, responseStyle: 'Match their energy! Be enthusiastic.' };
  }

  if (/(asap|urgent|deadline|running late|need this now|hurry|quickly|stressed|overwhelmed)/i.test(lower)) {
    return { mood: 'stressed', confidence: 0.8, responseStyle: 'Be calm and efficient. Get to the point.' };
  }

  if (/(ugh|again\?|not working|broken|frustrated|annoying|why (isn't|won't|can't)|still not|keeps)/i.test(lower)) {
    return { mood: 'frustrated', confidence: 0.8, responseStyle: 'Acknowledge frustration. Focus on solutions.' };
  }

  if (/(thanks|thank you|appreciate|helpful|good job|well done|happy|glad)/i.test(lower)) {
    return { mood: 'happy', confidence: 0.7, responseStyle: 'Be warm. Accept appreciation gracefully.' };
  }

  if (message.split(' ').length <= 4 && !message.includes('?')) {
    return { mood: 'rushed', confidence: 0.6, responseStyle: 'Be ultra-concise. Skip pleasantries.' };
  }

  if (/(how (do|does|can|would)|what (is|are|if)|why (is|do)|can you (explain|tell)|wondering|curious)/i.test(lower)) {
    return { mood: 'curious', confidence: 0.7, responseStyle: 'Be informative but brief.' };
  }

  return { mood: 'neutral', confidence: 0.5, responseStyle: 'Be warm and helpful.' };
}

// =============================================================================
// RESPONSE HUMANIZATION
// =============================================================================

function humanizeResponse(response: string, mood: UserMood): string {
  let text = response;

  // Strip all markdown formatting
  text = text.replace(/\*\*/g, '');
  text = text.replace(/\*/g, '');
  text = text.replace(/^[-•]\s*/gm, '');
  text = text.replace(/^\d+\.\s*/gm, '');
  text = text.replace(/#{1,6}\s*/g, '');
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove robotic phrases
  const roboticPhrases = [
    /I would be (happy|delighted|glad) to/gi,
    /Certainly[,!]/gi,
    /I understand (that )?(you|your)/gi,
    /Please let me know if/gi,
    /Is there anything else I can/gi,
    /I can assist you with/gi,
    /I'd be happy to help/gi,
    /Would you like me to/gi,
  ];
  roboticPhrases.forEach(p => { text = text.replace(p, ''); });

  // Clean up double spaces and leading whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();

  // Limit length for voice (max ~50 words unless it's a data response)
  const words = text.split(' ');
  if (words.length > 55) {
    let cutoff = 45;
    for (let i = 40; i < 55; i++) {
      if (words[i]?.endsWith('.') || words[i]?.endsWith('?') || words[i]?.endsWith('!')) {
        cutoff = i + 1;
        break;
      }
    }
    text = words.slice(0, cutoff).join(' ');
    if (!text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!')) {
      text += '.';
    }
  }

  // Remove any leaked [ACTION] blocks
  text = text.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
  text = text.replace(/\[ACTION_CHAIN\][\s\S]*?\[\/ACTION_CHAIN\]/g, '').trim();
  text = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/g, '').trim();

  return text;
}

// =============================================================================
// TTS GENERATION
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

async function generateSpeechAudio(
  text: string,
  voice: string = DEFAULT_VOICE
): Promise<{ audio: string; format: string; byteLength: number }> {
  const safeVoice = VALID_VOICES.includes(voice) ? voice : DEFAULT_VOICE;

  console.log(`[Voice TTS] Generating: "${text.substring(0, 60)}..." voice=${safeVoice}`);

  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-3b-0.1-ft',
      input: text,
      voice: safeVoice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Voice TTS] Error:', err);
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return {
    audio: arrayBufferToBase64(buffer),
    format: 'mp3',
    byteLength: buffer.byteLength,
  };
}

// =============================================================================
// VOICE-SPECIFIC SYSTEM PROMPT ADDITION
// =============================================================================

function buildVoiceContextMessage(mood: MoodAnalysis): string {
  return `[VOICE MODE - IMPORTANT INSTRUCTIONS]
You are in a real-time voice conversation. Follow these rules strictly:
1. Maximum 2 sentences per response, unless reading back data the user asked for
2. Use contractions always: I'm, you're, let's, that's, here's, don't, won't
3. Natural fillers OK: "So,", "Well,", "Actually,", "Honestly,"
4. NEVER use formatting: No markdown, no bullets, no asterisks, no numbered lists, no bold
5. No technical jargon: Say "about twelve hundred" not "1,247"
6. Dates naturally: Say "last Tuesday" not "January 28th 2026"
7. Currency naturally: Say "thirty-five euros" not "EUR 35.19"
8. When listing items: max 3, then "and a few more"
9. After completing an action: Summarize in ONE sentence. "Done! Invoice created for Bram."
10. Never read back JSON or technical data - summarize it conversationally

USER MOOD: ${mood.mood.toUpperCase()} - ${mood.responseStyle}

GOOD voice responses:
- "On it! How much is it for?"
- "Found it! Philips OneBlade at thirty-five euros."
- "Done! Invoice sent to Bram."
- "You've got 3 overdue tasks. Want me to list them?"

BAD voice responses:
- "I would be happy to create an invoice. Could you please provide the amount?"
- "I found 1 result: Philips OneBlade 360 Face | Price: EUR 35.19 | Stock: 150 units"
[/VOICE MODE]

User's actual message: `;
}

// =============================================================================
// CALL MAIN SYNC ENDPOINT
// =============================================================================

async function callMainSync(
  message: string,
  sessionId: string,
  context: any,
  authHeader: string,
  mood: MoodAnalysis,
): Promise<any> {
  const syncUrl = `${SUPABASE_URL}/functions/v1/sync`;

  // Prepend voice instructions to the message so the LLM knows to be concise
  const voiceMessage = buildVoiceContextMessage(mood) + message;

  console.log(`[sync-voice] Calling main sync...`);

  const response = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: voiceMessage,
      sessionId,
      stream: false,
      voice: true,
      context: {
        ...context,
        source: 'voice-mode',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[sync-voice] Main sync error:', response.status, error);
    throw new Error(`SYNC returned ${response.status}`);
  }

  return response.json();
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
      sessionId,
      voice: requestedVoice,
      voiceConfig,
      context = {},
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voice = VALID_VOICES.includes(requestedVoice || voiceConfig?.voice)
      ? (requestedVoice || voiceConfig?.voice)
      : DEFAULT_VOICE;

    console.log(`[sync-voice] Processing: "${message.substring(0, 50)}..." voice=${voice}`);
    const startTime = Date.now();

    // 1. Detect user mood
    const moodAnalysis = detectUserMood(message);
    console.log(`[sync-voice] Mood: ${moodAnalysis.mood} (${moodAnalysis.confidence})`);

    // 2. Get auth header from original request to pass to main sync
    const authHeader = req.headers.get('Authorization') || `Bearer ${SUPABASE_ANON_KEY}`;

    // 3. Call main sync endpoint (gets LLM response + executes actions)
    const syncStart = Date.now();
    const syncResponse = await callMainSync(message, sessionId, context, authHeader, moodAnalysis);
    const syncTime = Date.now() - syncStart;
    console.log(`[sync-voice] Sync responded in ${syncTime}ms`);

    // 4. Extract response text from sync response
    const rawText = syncResponse.response || syncResponse.text || "I'm here to help!";
    console.log(`[sync-voice] Raw response: "${rawText.substring(0, 80)}..."`);

    // 5. Humanize for voice output
    const humanizedText = humanizeResponse(rawText, moodAnalysis.mood);
    console.log(`[sync-voice] Humanized: "${humanizedText.substring(0, 80)}..."`);

    // 6. Generate TTS audio
    let audio = '';
    let audioFormat = 'mp3';
    let ttsTime = 0;

    if (humanizedText.length > 0) {
      const ttsStart = Date.now();
      try {
        const ttsResult = await generateSpeechAudio(humanizedText, voice);
        audio = ttsResult.audio;
        audioFormat = ttsResult.format;
        ttsTime = Date.now() - ttsStart;
        console.log(`[sync-voice] TTS: ${ttsTime}ms, ${ttsResult.byteLength} bytes`);
      } catch (err) {
        console.error('[sync-voice] TTS failed, returning text only:', err);
        ttsTime = Date.now() - ttsStart;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total: ${totalTime}ms | sync=${syncTime}ms tts=${ttsTime}ms`);

    return new Response(
      JSON.stringify({
        text: humanizedText,
        response: humanizedText,
        audio,
        audioFormat,
        mood: moodAnalysis.mood,
        // Pass through action data from main sync
        actionExecuted: syncResponse.actionExecuted || false,
        actions: syncResponse.actions || [],
        // Timing breakdown
        timing: {
          total: totalTime,
          sync: syncTime,
          tts: ttsTime,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('[sync-voice] Error:', error);

    // Human-sounding error responses
    const errorResponses = [
      "Sorry, something went wrong on my end. Try that again?",
      "Hmm, I hit a snag. Mind repeating that?",
      "Oops, technical hiccup. One more time?",
    ];
    const errorText = errorResponses[Math.floor(Math.random() * errorResponses.length)];

    // Try to generate TTS for the error response too
    let errorAudio = '';
    try {
      const ttsResult = await generateSpeechAudio(errorText, DEFAULT_VOICE);
      errorAudio = ttsResult.audio;
    } catch (_) {
      // Silent fail - text response is fine
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        text: errorText,
        response: errorText,
        audio: errorAudio,
        audioFormat: 'mp3',
        mood: 'neutral',
      }),
      {
        status: 200, // Return 200 so the frontend can still play the error audio
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
