/**
 * SYNC Voice API - Human-Like Personal Assistant
 *
 * Design Philosophy: SYNC should feel like talking to a real human assistant
 * who knows you, remembers your preferences, and genuinely cares about helping.
 *
 * Key Features:
 * - Personality: Warm, competent, slightly informal but professional
 * - Emotional Intelligence: Detects and matches user's mood
 * - Memory: Remembers preferences and past interactions
 * - Natural Speech: Uses contractions, fillers, varies pacing
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

// =============================================================================
// PERSONALITY CONFIGURATION
// =============================================================================

const SYNC_PERSONALITY = {
  name: "SYNC",
  traits: [
    "warm and approachable",
    "competent and reliable",
    "slightly informal but professional",
    "genuinely interested in helping",
    "good sense of humor when appropriate",
    "remembers details about the user",
  ],
  speaking_style: [
    "uses contractions naturally (I'm, you're, let's, don't)",
    "occasionally uses filler words (well, so, actually, honestly)",
    "varies sentence length - mix of short and medium",
    "asks follow-up questions to show engagement",
    "uses the user's name occasionally",
  ],
};

// =============================================================================
// MOOD DETECTION
// =============================================================================

type UserMood = 'excited' | 'stressed' | 'frustrated' | 'neutral' | 'happy' | 'rushed' | 'curious';

interface MoodAnalysis {
  mood: UserMood;
  confidence: number;
  responseStyle: string;
}

function detectUserMood(message: string, conversationHistory: any[]): MoodAnalysis {
  const lowerMessage = message.toLowerCase();

  // Excitement indicators
  const excitedPatterns = /(!{2,}|amazing|awesome|great news|fantastic|yes!|perfect|love it|incredible)/i;
  if (excitedPatterns.test(message)) {
    return {
      mood: 'excited',
      confidence: 0.8,
      responseStyle: 'Match their energy! Be enthusiastic and celebratory.'
    };
  }

  // Stress/urgency indicators
  const stressedPatterns = /(asap|urgent|deadline|running late|need this now|hurry|quickly|stressed|overwhelmed|too much)/i;
  if (stressedPatterns.test(lowerMessage)) {
    return {
      mood: 'stressed',
      confidence: 0.8,
      responseStyle: 'Be calm and reassuring. Get to the point quickly. Offer to help prioritize.'
    };
  }

  // Frustration indicators
  const frustratedPatterns = /(ugh|again\?|not working|broken|frustrated|annoying|why (isn\'t|won\'t|can\'t)|this is|still not|keeps)/i;
  if (frustratedPatterns.test(lowerMessage)) {
    return {
      mood: 'frustrated',
      confidence: 0.8,
      responseStyle: 'Acknowledge the frustration. Be empathetic. Focus on solutions, not explanations.'
    };
  }

  // Happy/positive indicators
  const happyPatterns = /(thanks|thank you|appreciate|helpful|good job|well done|nice|happy|glad|pleased)/i;
  if (happyPatterns.test(lowerMessage)) {
    return {
      mood: 'happy',
      confidence: 0.7,
      responseStyle: 'Be warm and friendly. Accept appreciation gracefully.'
    };
  }

  // Rushed/brief indicators (short messages, commands)
  if (message.split(' ').length <= 4 && !message.includes('?')) {
    return {
      mood: 'rushed',
      confidence: 0.6,
      responseStyle: 'Be concise and efficient. Skip pleasantries, get to action.'
    };
  }

  // Curious/questioning
  const curiousPatterns = /(how (do|does|can|would)|what (is|are|if)|why (is|do|does)|can you (explain|tell|show)|I\'m wondering|curious)/i;
  if (curiousPatterns.test(lowerMessage)) {
    return {
      mood: 'curious',
      confidence: 0.7,
      responseStyle: 'Be informative but conversational. Offer to explain more if needed.'
    };
  }

  return {
    mood: 'neutral',
    confidence: 0.5,
    responseStyle: 'Be warm and helpful. Standard friendly assistant tone.'
  };
}

// =============================================================================
// DYNAMIC SYSTEM PROMPT
// =============================================================================

function buildVoiceSystemPrompt(
  moodAnalysis: MoodAnalysis,
  userContext: {
    userName?: string;
    preferences?: any;
    recentTopics?: string[];
    timeOfDay: string;
  }
): string {
  const { mood, responseStyle } = moodAnalysis;
  const { userName, preferences, recentTopics, timeOfDay } = userContext;

  // Time-appropriate greeting context
  const timeContext = timeOfDay === 'morning'
    ? "It's morning - be energetic but not overwhelming."
    : timeOfDay === 'evening'
    ? "It's evening - be calm and winding-down appropriate."
    : timeOfDay === 'night'
    ? "It's late - be understanding if they're working late, keep it brief."
    : "It's afternoon - standard energy level.";

  return `You are SYNC, a personal AI assistant having a real-time voice conversation.

## YOUR PERSONALITY
You're like a trusted colleague who happens to be incredibly efficient. You're:
- Warm and genuine (not fake-cheerful)
- Competent and reliable (you get things done)
- Slightly informal but always professional
- You remember details and reference them naturally
- You have a sense of humor when appropriate

## CURRENT CONVERSATION CONTEXT
${timeContext}
${userName ? `User's name: ${userName}. Use it occasionally (not every response).` : ''}
${recentTopics?.length ? `Recent topics discussed: ${recentTopics.join(', ')}. Reference these naturally if relevant.` : ''}

## USER'S CURRENT MOOD: ${mood.toUpperCase()}
${responseStyle}

## VOICE-SPECIFIC RULES (CRITICAL)
1. **Be conversational**: Use contractions (I'm, you're, let's, don't, won't)
2. **Keep it short**: 1-3 sentences MAX. This is voice, not text.
3. **Sound natural**: Occasional fillers are OK ("Well,", "So,", "Actually,", "Honestly,")
4. **Never use formatting**: No markdown, bullets, asterisks, or numbered lists
5. **No technical jargon**: Speak like a human, not a computer
6. **React appropriately**: Match the user's energy level

## RESPONSE PATTERNS BY MOOD

${mood === 'excited' ? `
User is EXCITED! Match their energy:
- "That's fantastic! Let me..."
- "Oh wow, congrats! I'll..."
- "Love it! So..."
` : ''}

${mood === 'stressed' ? `
User is STRESSED. Be calm and efficient:
- "Got it. I'll handle that right now."
- "No worries, let me take care of this."
- "On it. Just give me a sec."
` : ''}

${mood === 'frustrated' ? `
User is FRUSTRATED. Be empathetic and solution-focused:
- "I hear you. Let's fix this."
- "That's annoying, I get it. Here's what I can do..."
- "Sorry you're dealing with this. Let me help."
` : ''}

${mood === 'rushed' ? `
User is RUSHED. Be ultra-concise:
- "Done."
- "On it."
- "Got it, one sec."
- "Here you go."
` : ''}

${mood === 'curious' ? `
User is CURIOUS. Be informative but brief:
- "Good question! So basically..."
- "Yeah, so the way that works is..."
- "Honestly, the simple version is..."
` : ''}

${mood === 'happy' || mood === 'neutral' ? `
User is ${mood.toUpperCase()}. Be warm and natural:
- "Sure thing!"
- "Absolutely, let me..."
- "Of course!"
- "Happy to help with that."
` : ''}

## THINGS TO AVOID
- Starting every response with "Sure!" or "Of course!" (vary it)
- Being overly formal ("I would be delighted to assist you")
- Long explanations (save those for text chat)
- Robotic phrases ("I understand you want to..." - just do it!)
- Apologizing excessively
- Repeating what the user just said

## EXAMPLES OF GREAT VOICE RESPONSES

User: "Create an invoice for Acme Corp"
Good: "On it! How much is it for?"
Bad: "Certainly! I would be happy to create an invoice for Acme Corp. Could you please provide me with the amount?"

User: "Ugh, the client still hasn't paid"
Good: "That's frustrating. Want me to send them a reminder?"
Bad: "I understand your frustration. Would you like me to assist you with following up?"

User: "We just closed the big deal!!!"
Good: "Yes! That's huge, congrats! Want me to update the pipeline?"
Bad: "Congratulations on closing the deal. Would you like me to update the records?"

User: "tasks"
Good: "You've got 3 overdue. Want me to list them?"
Bad: "I'd be happy to help you with your tasks. Let me retrieve your task list for you."

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

// =============================================================================
// RESPONSE POST-PROCESSING
// =============================================================================

function humanizeResponse(response: string, mood: UserMood): string {
  let processed = response;

  // Remove any accidental markdown
  processed = processed.replace(/\*\*/g, '');
  processed = processed.replace(/\*/g, '');
  processed = processed.replace(/^[-•]\s*/gm, '');
  processed = processed.replace(/^\d+\.\s*/gm, '');

  // Remove robotic phrases
  const roboticPhrases = [
    /I would be (happy|delighted|glad) to/gi,
    /Certainly[,!]/gi,
    /I understand (that )?(you|your)/gi,
    /Please let me know if/gi,
    /Is there anything else I can/gi,
    /I can assist you with/gi,
  ];

  roboticPhrases.forEach(pattern => {
    processed = processed.replace(pattern, '');
  });

  // Clean up any double spaces
  processed = processed.replace(/\s{2,}/g, ' ').trim();

  // Ensure response isn't too long for voice (max ~40 words)
  const words = processed.split(' ');
  if (words.length > 45) {
    // Find a natural break point
    let cutoff = 40;
    for (let i = 35; i < 45; i++) {
      if (words[i]?.endsWith('.') || words[i]?.endsWith('?') || words[i]?.endsWith('!')) {
        cutoff = i + 1;
        break;
      }
    }
    processed = words.slice(0, cutoff).join(' ');
    if (!processed.endsWith('.') && !processed.endsWith('?') && !processed.endsWith('!')) {
      processed += '.';
    }
  }

  return processed;
}

// =============================================================================
// VOICE PACING HINTS (for future TTS improvements)
// =============================================================================

interface VoicePacing {
  speed: 'slow' | 'normal' | 'fast';
  emotion: 'neutral' | 'happy' | 'concerned' | 'excited';
  emphasis: string[]; // words to emphasize
}

function getVoicePacing(response: string, mood: UserMood): VoicePacing {
  const pacing: VoicePacing = {
    speed: 'normal',
    emotion: 'neutral',
    emphasis: [],
  };

  // Adjust based on mood
  switch (mood) {
    case 'excited':
      pacing.speed = 'fast';
      pacing.emotion = 'excited';
      break;
    case 'stressed':
    case 'rushed':
      pacing.speed = 'fast';
      pacing.emotion = 'neutral';
      break;
    case 'frustrated':
      pacing.speed = 'normal';
      pacing.emotion = 'concerned';
      break;
    case 'happy':
      pacing.speed = 'normal';
      pacing.emotion = 'happy';
      break;
    case 'curious':
      pacing.speed = 'normal';
      pacing.emotion = 'neutral';
      break;
  }

  // Find words to emphasize (numbers, names, key terms)
  const numberPattern = /\b(\d+)\b/g;
  const matches = response.match(numberPattern);
  if (matches) {
    pacing.emphasis.push(...matches);
  }

  return pacing;
}

// =============================================================================
// USER CONTEXT & MEMORY
// =============================================================================

async function getUserContext(
  supabase: any,
  userId?: string,
  companyId?: string
): Promise<{ userName?: string; preferences?: any; recentTopics?: string[] }> {
  if (!userId) return {};

  try {
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('full_name, first_name, preferences')
      .eq('id', userId)
      .single();

    // Get recent voice session topics (from sync_sessions)
    const { data: recentSessions } = await supabase
      .from('sync_sessions')
      .select('active_entities')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })
      .limit(3);

    const recentTopics: string[] = [];
    if (recentSessions) {
      recentSessions.forEach((session: any) => {
        if (session.active_entities?.current_intent) {
          recentTopics.push(session.active_entities.current_intent);
        }
        if (session.active_entities?.clients) {
          session.active_entities.clients.forEach((c: any) => {
            if (c.name) recentTopics.push(`client: ${c.name}`);
          });
        }
      });
    }

    return {
      userName: user?.first_name || user?.full_name?.split(' ')[0],
      preferences: user?.preferences,
      recentTopics: [...new Set(recentTopics)].slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {};
  }
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// =============================================================================
// LLM CALL
// =============================================================================

async function getVoiceResponse(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  moodAnalysis: MoodAnalysis
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
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
      max_tokens: 100, // Even shorter for voice - forces conciseness
      temperature: moodAnalysis.mood === 'excited' ? 0.8 : 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LLM error:', error);
    throw new Error('Failed to get response');
  }

  const data = await response.json();
  let responseText = data.choices[0]?.message?.content || "I'm here to help!";

  // Post-process to ensure it's human-like
  responseText = humanizeResponse(responseText, moodAnalysis.mood);

  return responseText;
}

// =============================================================================
// TTS GENERATION
// =============================================================================

const VOICES = {
  tara: 'tara',     // Female, friendly (default)
  leah: 'leah',     // Female, professional
  jess: 'jess',     // Female, energetic
  leo: 'leo',       // Male, calm
  dan: 'dan',       // Male, authoritative
  mia: 'mia',       // Female, warm
  zac: 'zac',       // Male, casual
  zoe: 'zoe',       // Female, cheerful
};

async function generateSpeech(
  text: string,
  voice: string = 'tara',
  pacing: VoicePacing
): Promise<ArrayBuffer> {
  console.log(`[TTS] Generating speech: "${text.substring(0, 50)}..." voice: ${voice}, speed: ${pacing.speed}`);

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
      // Note: speed/emotion control depends on TTS API capabilities
      // These are stored for future enhancement
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS error:', error);
    throw new Error(`TTS failed: ${error}`);
  }

  return await response.arrayBuffer();
}

// =============================================================================
// UTILITY
// =============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const validVoices = Object.keys(VOICES);
    const voice = validVoices.includes(requestedVoice) ? requestedVoice : 'tara';

    console.log(`[sync-voice] Processing: "${message.substring(0, 50)}..."`);
    const startTime = Date.now();

    // 1. Detect user mood
    const moodAnalysis = detectUserMood(message, conversationHistory);
    console.log(`[sync-voice] Detected mood: ${moodAnalysis.mood} (${moodAnalysis.confidence})`);

    // 2. Get user context for personalization
    const userContext = await getUserContext(supabase, context.userId, context.companyId);
    userContext.timeOfDay = getTimeOfDay();

    // 3. Build dynamic system prompt
    const systemPrompt = buildVoiceSystemPrompt(moodAnalysis, userContext);

    // 4. Get LLM response
    const llmStart = Date.now();
    const responseText = await getVoiceResponse(message, conversationHistory, systemPrompt, moodAnalysis);
    const llmTime = Date.now() - llmStart;
    console.log(`[sync-voice] LLM (${llmTime}ms): "${responseText.substring(0, 60)}..."`);

    // 5. Get voice pacing hints
    const pacing = getVoicePacing(responseText, moodAnalysis.mood);

    // 6. Generate speech
    const ttsStart = Date.now();
    const audioBuffer = await generateSpeech(responseText, voice, pacing);
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const ttsTime = Date.now() - ttsStart;
    console.log(`[sync-voice] TTS (${ttsTime}ms): ${audioBuffer.byteLength} bytes`);

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total: ${totalTime}ms | Mood: ${moodAnalysis.mood}`);

    return new Response(
      JSON.stringify({
        text: responseText,
        audio: audioBase64,
        audioFormat: 'mp3',
        mood: moodAnalysis.mood,
        timing: {
          total: totalTime,
          llm: llmTime,
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

    // Even errors should sound human
    const errorResponses = [
      "Sorry, something went wrong on my end. Try that again?",
      "Hmm, I hit a snag. Mind repeating that?",
      "Oops, technical hiccup. One more time?",
    ];
    const errorText = errorResponses[Math.floor(Math.random() * errorResponses.length)];

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        text: errorText,
        mood: 'neutral',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
