/**
 * SYNC Voice API
 * Real-time voice conversation endpoint with full SYNC capabilities + TTS
 *
 * Flow:
 * 1. Receives transcribed text from client (browser STT)
 * 2. Calls main /sync endpoint for full action capabilities
 * 3. Generates speech with Together.ai TTS
 * 4. Returns audio for playback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Available TTS voices via Together.ai (Orpheus model)
const VALID_VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];

// Call the main SYNC endpoint for full capabilities
async function callSyncAgent(
  message: string,
  sessionId: string,
  context: { userId?: string; companyId?: string }
): Promise<{ text: string; actionExecuted?: any }> {
  console.log(`[sync-voice] Calling main SYNC agent with: "${message.substring(0, 50)}..."`);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
      stream: false, // Don't stream for voice - we need complete response
      mode: 'fast',  // Use fast mode to skip workflows
      voice: true,   // Enable voice mode for faster model + shorter responses
      context: {
        userId: context.userId,
        companyId: context.companyId,
        source: 'voice-mode',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[sync-voice] SYNC agent error:', error);
    throw new Error('Failed to get response from SYNC');
  }

  const data = await response.json();

  // Clean up the response for voice (remove markdown, emojis, structured data)
  let cleanText = data.response || "I'm here to help!";

  // Remove all emojis (comprehensive regex)
  cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|✅|❌|📊|📈|💡|🎯|⚡|✓|✗/gu, '');

  // Remove markdown formatting
  cleanText = cleanText
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
    .replace(/\*([^*]+)\*/g, '$1')      // Italic
    .replace(/`([^`]+)`/g, '$1')        // Code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links
    .replace(/#{1,6}\s+/g, '')          // Headers
    .replace(/•\s+/g, '')               // Bullet points
    .replace(/---+/g, '')               // Horizontal rules
    .replace(/\|/g, ', ')               // Table separators

  // Remove structured data labels (common patterns from SYNC responses)
  cleanText = cleanText
    .replace(/Client:\s*/gi, '')
    .replace(/Total:\s*/gi, '')
    .replace(/Status:\s*/gi, '')
    .replace(/Valid until:\s*/gi, 'valid until ')
    .replace(/Amount:\s*/gi, '')
    .replace(/\(incl\.\s*BTW\)/gi, 'including tax')
    .replace(/\(excl\.\s*BTW\)/gi, 'excluding tax')

  // Clean up whitespace
  cleanText = cleanText
    .replace(/\n{2,}/g, '. ')           // Multiple newlines to period
    .replace(/\n/g, ' ')                // Single newlines to space
    .replace(/\s{2,}/g, ' ')            // Multiple spaces
    .replace(/\.\s*\./g, '.')           // Double periods
    .replace(/,\s*,/g, ',')             // Double commas
    .trim();

  // Truncate for voice - much shorter for natural conversation (~15 seconds max)
  if (cleanText.length > 250) {
    // Find a good break point
    const breakPoint = cleanText.lastIndexOf('.', 220);
    if (breakPoint > 100) {
      cleanText = cleanText.substring(0, breakPoint + 1);
    } else {
      cleanText = cleanText.substring(0, 220) + '.';
    }
  }

  return {
    text: cleanText,
    actionExecuted: data.actionExecuted,
  };
}

// Generate speech with Together.ai TTS (Orpheus model)
async function generateSpeech(
  text: string,
  voice: string = 'tara'
): Promise<ArrayBuffer> {
  console.log(`[sync-voice] Generating speech for: "${text.substring(0, 50)}..." with voice: ${voice}`);

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
    console.error('[sync-voice] TTS error:', error);
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
      conversationHistory = [], // Kept for compatibility but SYNC manages its own history
      voice: requestedVoice,
      context = {}
    } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate voice
    const voice = VALID_VOICES.includes(requestedVoice) ? requestedVoice : 'tara';

    console.log(`[sync-voice] Processing: "${message.substring(0, 50)}..." with voice: ${voice}`);
    const startTime = Date.now();

    // Call main SYNC agent for full capabilities (proposals, invoices, products, etc.)
    const syncStart = Date.now();
    const syncResponse = await callSyncAgent(message, sessionId, context);
    const syncTime = Date.now() - syncStart;
    console.log(`[sync-voice] SYNC response in ${syncTime}ms: "${syncResponse.text.substring(0, 50)}..."`);

    // Log if an action was executed
    if (syncResponse.actionExecuted) {
      console.log(`[sync-voice] Action executed: ${syncResponse.actionExecuted.type} - success: ${syncResponse.actionExecuted.success}`);
    }

    // Generate speech
    const ttsStart = Date.now();
    const audioBuffer = await generateSpeech(syncResponse.text, voice);
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const ttsTime = Date.now() - ttsStart;
    console.log(`[sync-voice] TTS generated in ${ttsTime}ms (${audioBuffer.byteLength} bytes)`);

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total processing time: ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        text: syncResponse.text,
        audio: audioBase64,
        audioFormat: 'mp3',
        actionExecuted: syncResponse.actionExecuted,
        timing: {
          total: totalTime,
          sync: syncTime,
          tts: ttsTime,
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
