/**
 * Generate Podcast Edge Function
 *
 * Two modes:
 * 1. Script Generation (generateScript=true) - Uses Together.ai LLM to create a podcast script
 * 2. Audio Generation (script provided) - Uses Together.ai TTS to generate audio for each segment
 *
 * TTS model: canopylabs/orpheus-3b-0.1-ft (same as sync-voice)
 * LLM model: moonshotai/Kimi-K2-Instruct
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { logLLMUsage, logAIUsage } from '../_shared/ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TTS_MODEL = 'canopylabs/orpheus-3b-0.1-ft';
const LLM_MODEL = 'moonshotai/Kimi-K2-Instruct';
const VALID_VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];

// =============================================================================
// Types
// =============================================================================

interface ScriptSegment {
  speaker: string;
  text: string;
  voiceId: string;
}

interface Speaker {
  name: string;
  voiceId: string;
  role?: string;
}

interface PodcastRequest {
  script?: ScriptSegment[];
  topic?: string;
  style?: string;
  tone?: string;
  duration?: number;
  speakers?: Speaker[];
  generateScript?: boolean;
  userId?: string;
  companyId?: string;
}

// =============================================================================
// TTS Generation (from sync-voice pattern)
// =============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateTTS(text: string, voice: string): Promise<{ audio: string; byteLength: number }> {
  const safeVoice = VALID_VOICES.includes(voice) ? voice : 'leo';

  const response = await fetch('https://api.together.ai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: safeVoice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    throw new Error(`TTS failed (${response.status}): ${errorText}`);
  }

  const buffer = await response.arrayBuffer();
  return { audio: arrayBufferToBase64(buffer), byteLength: buffer.byteLength };
}

// =============================================================================
// Script Generation via LLM
// =============================================================================

function buildScriptPrompt(
  topic: string,
  style: string,
  tone: string,
  duration: number,
  speakers: Speaker[],
): string {
  const speakerList = speakers
    .map((s) => `- ${s.name} (voice: ${s.voiceId}${s.role ? `, role: ${s.role}` : ''})`)
    .join('\n');

  // Estimate segment count: ~15 seconds per segment, roughly
  const estimatedSegments = Math.max(4, Math.round((duration * 60) / 15));

  return `You are a professional podcast script writer. Generate a natural, engaging podcast script.

TOPIC: ${topic}
STYLE: ${style}
TONE: ${tone}
TARGET DURATION: ${duration} minutes (approximately ${estimatedSegments} speaking segments)

SPEAKERS:
${speakerList}

RULES:
- Write natural, conversational dialogue — not robotic or overly formal
- Each segment should be 1-3 sentences (15-30 seconds of speech)
- Include natural transitions: "That's a great point...", "So what you're saying is...", "Let me add to that..."
- Start with a brief introduction of the topic
- End with a summary or call-to-action
- Vary segment lengths for natural rhythm
- For "${style}" style:
  ${style === 'interview' ? '- One speaker asks questions, the other answers. Include follow-ups.' : ''}
  ${style === 'conversation' ? '- Both speakers share perspectives equally. Natural back-and-forth.' : ''}
  ${style === 'monologue' ? '- Primarily one speaker with occasional interjections from the other.' : ''}
  ${style === 'debate' ? '- Speakers present different viewpoints. Respectful disagreement.' : ''}
  ${style === 'storytelling' ? '- Narrative structure with a beginning, middle, and end. Use vivid descriptions.' : ''}
- For "${tone}" tone:
  ${tone === 'professional' ? '- Industry language, data-driven, authoritative but accessible.' : ''}
  ${tone === 'casual' ? '- Relaxed, use contractions, occasional humor, like friends chatting.' : ''}
  ${tone === 'educational' ? '- Clear explanations, examples, break down complex concepts.' : ''}
  ${tone === 'humorous' ? '- Light-hearted, witty, include jokes and playful banter.' : ''}
  ${tone === 'inspirational' ? '- Uplifting, motivational, personal stories, empowering language.' : ''}

OUTPUT FORMAT (strict JSON array — no markdown, no code fences):
[
  {"speaker": "SpeakerName", "text": "What they say", "voiceId": "their_voice_id"},
  ...
]

Generate approximately ${estimatedSegments} segments. Respond ONLY with the JSON array, nothing else.`;
}

async function generateScript(
  topic: string,
  style: string,
  tone: string,
  duration: number,
  speakers: Speaker[],
): Promise<{ script: ScriptSegment[]; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  const prompt = buildScriptPrompt(topic, style, tone, duration, speakers);

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: 'You are a podcast script writer. Output only valid JSON arrays. No markdown, no code fences, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown');
    throw new Error(`LLM script generation failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Parse the script from LLM output
  let script: ScriptSegment[];
  try {
    // Strip markdown code fences if present
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    script = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[generate-podcast] Failed to parse LLM script output:', content.substring(0, 200));
    throw new Error('Failed to parse generated script. The AI returned invalid JSON.');
  }

  // Validate and fix script entries
  const speakerMap = new Map(speakers.map((s) => [s.name.toLowerCase(), s]));

  script = script.map((segment: ScriptSegment) => {
    const matchedSpeaker = speakerMap.get(segment.speaker?.toLowerCase());
    return {
      speaker: segment.speaker || speakers[0]?.name || 'Host',
      text: String(segment.text || ''),
      voiceId: segment.voiceId || matchedSpeaker?.voiceId || speakers[0]?.voiceId || 'leo',
    };
  }).filter((s: ScriptSegment) => s.text.length > 0);

  return { script, usage };
}

// =============================================================================
// Audio Generation Pipeline
// =============================================================================

interface AudioSegmentResult {
  speaker: string;
  text: string;
  voiceId: string;
  audio: string;
  byteLength: number;
  durationEstimate: number;
  error?: string;
}

async function generateAudioSegments(
  script: ScriptSegment[],
): Promise<{ segments: AudioSegmentResult[]; totalBytes: number; failedCount: number }> {
  const segments: AudioSegmentResult[] = [];
  let totalBytes = 0;
  let failedCount = 0;

  // Process sequentially to avoid rate limiting
  for (let i = 0; i < script.length; i++) {
    const segment = script[i];
    console.log(`[generate-podcast] TTS segment ${i + 1}/${script.length}: ${segment.speaker} (${segment.voiceId}) — ${segment.text.substring(0, 50)}...`);

    try {
      const ttsResult = await generateTTS(segment.text, segment.voiceId);

      // Rough duration estimate: MP3 at ~128kbps = ~16KB/s
      const durationEstimate = Math.round(ttsResult.byteLength / 16000);

      segments.push({
        speaker: segment.speaker,
        text: segment.text,
        voiceId: segment.voiceId,
        audio: ttsResult.audio,
        byteLength: ttsResult.byteLength,
        durationEstimate,
      });

      totalBytes += ttsResult.byteLength;
    } catch (err) {
      console.error(`[generate-podcast] TTS segment ${i + 1} failed:`, err);
      failedCount++;

      // Include the segment with error marker so frontend knows what failed
      segments.push({
        speaker: segment.speaker,
        text: segment.text,
        voiceId: segment.voiceId,
        audio: '',
        byteLength: 0,
        durationEstimate: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Small delay between segments to be gentle on rate limits
    if (i < script.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { segments, totalBytes, failedCount };
}

// =============================================================================
// Storage Upload
// =============================================================================

async function uploadCombinedAudio(
  segments: AudioSegmentResult[],
  userId: string | undefined,
  companyId: string | undefined,
  topic: string | undefined,
): Promise<string | null> {
  try {
    // Collect all successful audio segments as binary
    const audioBuffers: Uint8Array[] = [];
    for (const seg of segments) {
      if (seg.audio && !seg.error) {
        const binary = atob(seg.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        audioBuffers.push(bytes);
      }
    }

    if (audioBuffers.length === 0) return null;

    // Concatenate all MP3 buffers (simple concatenation works for MP3)
    const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    // Upload to generated-content bucket
    const timestamp = Date.now();
    const safeTopic = (topic || 'podcast').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filePath = `podcasts/${userId || 'anonymous'}/${timestamp}_${safeTopic}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(filePath, combined.buffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[generate-podcast] Upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-content')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('[generate-podcast] Upload failed:', err);
    return null;
  }
}

// =============================================================================
// Save to generated_content table (if exists)
// =============================================================================

async function saveToGeneratedContent(
  audioUrl: string,
  topic: string | undefined,
  userId: string | undefined,
  companyId: string | undefined,
  durationSeconds: number,
  segmentCount: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('generated_content')
      .insert({
        user_id: userId || null,
        company_id: companyId || null,
        type: 'podcast',
        title: topic ? `Podcast: ${topic}` : 'Generated Podcast',
        url: audioUrl,
        metadata: {
          duration_seconds: durationSeconds,
          segment_count: segmentCount,
          generated_at: new Date().toISOString(),
        },
      });

    if (error) {
      // Table might not exist or schema mismatch — non-critical
      console.warn('[generate-podcast] Could not save to generated_content:', error.message);
    }
  } catch (err) {
    console.warn('[generate-podcast] generated_content save skipped:', err);
  }
}

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PodcastRequest = await req.json();
    const {
      script,
      topic,
      style = 'conversation',
      tone = 'professional',
      duration = 5,
      speakers = [],
      generateScript: shouldGenerateScript,
      userId,
      companyId,
    } = body;

    const startTime = Date.now();

    // =========================================================================
    // Mode 1: Script Generation
    // =========================================================================
    if (shouldGenerateScript) {
      if (!topic) {
        return new Response(
          JSON.stringify({ error: 'Topic is required when generateScript is true' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!speakers || speakers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'At least one speaker is required for script generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      console.log(`[generate-podcast] Generating script — topic="${topic}" style=${style} tone=${tone} duration=${duration}min speakers=${speakers.length}`);

      const { script: generatedScript, usage } = await generateScript(
        topic,
        style,
        tone,
        duration,
        speakers,
      );

      // Log LLM usage
      await logLLMUsage(supabase, LLM_MODEL, usage, {
        userId,
        companyId,
        requestType: 'chat',
        endpoint: '/v1/chat/completions',
        metadata: { feature: 'podcast_script' },
      });

      const elapsed = Date.now() - startTime;
      console.log(`[generate-podcast] Script generated: ${generatedScript.length} segments in ${elapsed}ms`);

      return new Response(
        JSON.stringify({
          script: generatedScript,
          segment_count: generatedScript.length,
          estimated_duration_minutes: duration,
          generation_time_ms: elapsed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // =========================================================================
    // Mode 2: Audio Generation
    // =========================================================================
    if (!script || script.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Script array is required for audio generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[generate-podcast] Generating audio — ${script.length} segments`);

    // Generate TTS for each segment sequentially
    const { segments, totalBytes, failedCount } = await generateAudioSegments(script);

    const successfulSegments = segments.filter((s) => !s.error);
    const totalDuration = successfulSegments.reduce((sum, s) => sum + s.durationEstimate, 0);

    console.log(`[generate-podcast] TTS complete: ${successfulSegments.length}/${script.length} segments, ${totalBytes} bytes, ~${totalDuration}s, ${failedCount} failed`);

    // Upload combined audio to storage
    let audioUrl: string | null = null;
    if (successfulSegments.length > 0) {
      audioUrl = await uploadCombinedAudio(segments, userId, companyId, topic);

      if (audioUrl) {
        console.log(`[generate-podcast] Uploaded to: ${audioUrl}`);

        // Save record to generated_content
        await saveToGeneratedContent(
          audioUrl,
          topic,
          userId,
          companyId,
          totalDuration,
          successfulSegments.length,
        );
      }
    }

    // Log TTS usage
    await logAIUsage(supabase, {
      user_id: userId,
      organization_id: companyId,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost: 0,
      request_type: 'completion',
      endpoint: '/v1/audio/speech',
      metadata: {
        feature: 'podcast_tts',
        segment_count: script.length,
        successful_segments: successfulSegments.length,
        failed_segments: failedCount,
        total_bytes: totalBytes,
        total_duration_seconds: totalDuration,
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`[generate-podcast] Done in ${elapsed}ms`);

    return new Response(
      JSON.stringify({
        audio_url: audioUrl,
        segments: segments.map((s) => ({
          speaker: s.speaker,
          text: s.text,
          voiceId: s.voiceId,
          audio: s.audio,
          duration_seconds: s.durationEstimate,
          error: s.error || undefined,
        })),
        duration_seconds: totalDuration,
        total_segments: script.length,
        successful_segments: successfulSegments.length,
        failed_segments: failedCount,
        generation_time_ms: elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[generate-podcast] Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
