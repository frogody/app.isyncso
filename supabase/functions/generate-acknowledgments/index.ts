/**
 * Generate Voice Acknowledgments
 * One-time utility to generate pre-recorded acknowledgments with SYNC's voice
 *
 * These audio clips are used for instant feedback in voice mode
 * Run once and copy the output to src/constants/voiceAcknowledgments.js
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// Acknowledgment phrases organized by intent
const ACKNOWLEDGMENTS = {
  search: [
    "Let me look that up for you.",
    "Searching now.",
    "Let me find that.",
  ],
  action: [
    "On it.",
    "I'll take care of that.",
    "Working on it now.",
  ],
  general: [
    "One moment.",
    "Sure thing.",
    "Got it.",
  ],
};

async function generateSpeech(text: string, voice: string = 'tara'): Promise<string> {
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
    throw new Error(`TTS failed: ${error}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const results: Record<string, Record<string, string>> = {};

    for (const [category, phrases] of Object.entries(ACKNOWLEDGMENTS)) {
      results[category] = {};
      for (const phrase of phrases) {
        console.log(`Generating: "${phrase}"`);
        const audio = await generateSpeech(phrase);
        results[category][phrase] = audio;
      }
    }

    // Output as JavaScript constant for easy copy-paste
    const jsOutput = `// Auto-generated voice acknowledgments with SYNC's voice (tara)
// Generated on ${new Date().toISOString()}
// Copy this entire file to src/constants/voiceAcknowledgments.js

export const VOICE_ACKNOWLEDGMENTS = ${JSON.stringify(results, null, 2)};

// Helper to get a random acknowledgment by category
export function getRandomAcknowledgment(category) {
  const phrases = Object.entries(VOICE_ACKNOWLEDGMENTS[category] || VOICE_ACKNOWLEDGMENTS.general);
  const [text, audio] = phrases[Math.floor(Math.random() * phrases.length)];
  return { text, audio };
}

// Detect which category of acknowledgment to use based on user message
export function detectAcknowledgmentCategory(message) {
  const lower = message.toLowerCase();

  // Action keywords - user wants to create/modify something
  if (/\\b(create|make|add|send|update|delete|remove|change|set|schedule|book|assign)\\b/.test(lower)) {
    return 'action';
  }

  // Search keywords - user wants to find/list something
  if (/\\b(find|search|look|show|list|get|what|how many|check|any)\\b/.test(lower)) {
    return 'search';
  }

  // Simple queries - greetings, yes/no, clarifications - no acknowledgment needed
  if (/^(hi|hello|hey|yes|no|yeah|nope|ok|okay|thanks|thank you|bye|goodbye)$/i.test(lower.trim())) {
    return null; // No acknowledgment for simple responses
  }

  return 'general';
}
`;

    return new Response(
      jsOutput,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
