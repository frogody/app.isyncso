/**
 * Voice Mode Module for SYNC
 * Handles TTS generation, mood detection, response humanization, and voice-specific prompting.
 * Used when voice=true is passed to the main /sync endpoint.
 */

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// =============================================================================
// TYPES
// =============================================================================

export type UserMood = 'excited' | 'stressed' | 'frustrated' | 'neutral' | 'happy' | 'rushed' | 'curious';

export interface MoodAnalysis {
  mood: UserMood;
  confidence: number;
  responseStyle: string;
}

export interface VoiceResult {
  audio: string;       // base64-encoded mp3
  audioFormat: string;  // 'mp3'
  mood: UserMood;
  timing: {
    tts: number;
    humanize: number;
  };
  humanizedText: string;
}

export interface VoiceConfig {
  voice?: string;       // TTS voice name (default: 'tara')
  skipTTS?: boolean;    // Return text only, no audio generation
}

// =============================================================================
// AVAILABLE VOICES
// =============================================================================

const VALID_VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];
const DEFAULT_VOICE = 'tara';

// =============================================================================
// MOOD DETECTION
// =============================================================================

export function detectUserMood(message: string): MoodAnalysis {
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
// VOICE-SPECIFIC SYSTEM PROMPT SECTION
// =============================================================================

export function getVoicePromptSection(mood: MoodAnalysis): string {
  return `

## VOICE MODE ACTIVE — CRITICAL RULES
You are speaking out loud in a real-time voice conversation. Follow these rules strictly:

1. **Maximum 2 sentences** per response, unless reading back data the user asked for
2. **Use contractions always**: I'm, you're, let's, that's, here's, don't, won't, can't, didn't
3. **Natural fillers OK**: "So,", "Well,", "Actually,", "Honestly,", "Right,"
4. **NEVER use formatting**: No markdown, no bullets, no asterisks, no numbered lists, no bold, no headers
5. **No technical jargon**: Say "about twelve hundred" not "1,247". Say "thirty-five euros" not "EUR 35.19"
6. **Dates naturally**: Say "last Tuesday" or "a couple days ago", not "January 28th 2026"
7. **Currency naturally**: Say "thirty-five euros" not "€35.19" or "EUR 35"
8. **Lists briefly**: When listing items, say max 3, then "and a few more"
9. **After actions**: Summarize what you did in ONE short sentence. "Done! Invoice created for Bram."
10. **Never read back JSON or technical data** — summarize it conversationally

## USER MOOD: ${mood.mood.toUpperCase()}
${mood.responseStyle}

## VOICE RESPONSE EXAMPLES
Good: "On it! How much is it for?"
Bad: "I would be happy to create an invoice. Could you please provide the amount?"

Good: "Found it! Philips OneBlade at thirty-five euros. Adding fifty-five?"
Bad: "I found 1 result: Philips OneBlade 360 Face | Price: €35.19 | Stock: 150 units"

Good: "Done! Invoice sent to Bram."
Bad: "I have successfully created and sent invoice #INV-2026-0042 to the client Bram at Energie West for a total of €2,341.89 including BTW."

Good: "You've got 3 overdue tasks. Want me to list them?"
Bad: "Let me retrieve your task list. You currently have 3 tasks that are past their due date."
`;
}

// =============================================================================
// RESPONSE HUMANIZATION
// =============================================================================

export function humanizeVoiceResponse(response: string, mood: UserMood): string {
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

  // Remove any remaining [ACTION] blocks that leaked through
  text = text.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
  text = text.replace(/\[ACTION_CHAIN\][\s\S]*?\[\/ACTION_CHAIN\]/g, '').trim();
  text = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/g, '').trim();

  return text;
}

// =============================================================================
// TTS GENERATION
// =============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateSpeechAudio(
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
// MAIN VOICE PROCESSING PIPELINE
// =============================================================================

/**
 * Process a text response for voice output.
 * 1. Detect mood from original user message
 * 2. Humanize the response text (strip markdown, shorten)
 * 3. Generate TTS audio
 * Returns the voice result to be merged into the SyncResponse.
 */
export async function processVoiceResponse(
  responseText: string,
  userMessage: string,
  config: VoiceConfig = {}
): Promise<VoiceResult> {
  const startTime = Date.now();

  // 1. Detect mood
  const mood = detectUserMood(userMessage);

  // 2. Humanize
  const humanizedText = humanizeVoiceResponse(responseText, mood.mood);
  const humanizeTime = Date.now() - startTime;

  // 3. Generate TTS (unless skipped)
  let audio = '';
  let audioFormat = 'mp3';
  let ttsTime = 0;

  if (!config.skipTTS && humanizedText.length > 0) {
    const ttsStart = Date.now();
    try {
      const ttsResult = await generateSpeechAudio(humanizedText, config.voice || DEFAULT_VOICE);
      audio = ttsResult.audio;
      audioFormat = ttsResult.format;
      ttsTime = Date.now() - ttsStart;
      console.log(`[Voice] TTS completed: ${ttsTime}ms, ${ttsResult.byteLength} bytes`);
    } catch (err) {
      console.error('[Voice] TTS failed, returning text only:', err);
      ttsTime = Date.now() - ttsStart;
    }
  }

  return {
    audio,
    audioFormat,
    mood: mood.mood,
    timing: {
      tts: ttsTime,
      humanize: humanizeTime,
    },
    humanizedText,
  };
}
