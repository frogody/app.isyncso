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
- Keep the confirmation short — the action happens in the background.

EMAIL CONTEXT:
- Messages may start with [EMAIL_CONTEXT: thread_id=X message_id=X from=Y subject=Z] — this means the user is responding to a specific email notification.
- When the user says "reply" or "respond", use that context to send the reply. Confirm naturally: "Sure, I'll send that reply for you."
- Don't read out technical IDs or the context line — keep it natural.`;

// =============================================================================
// ACTION DETECTION — keyword-based, zero latency
// =============================================================================

const ACTION_VERBS = [
  'send', 'create', 'make', 'add', 'delete', 'remove', 'update', 'change',
  'look up', 'lookup', 'find', 'search', 'check', 'show me', 'list',
  'schedule', 'assign', 'complete', 'generate', 'set up', 'configure',
  'connect', 'move', 'mark', 'cancel', 'approve', 'reject', 'invite',
  'reply', 'respond', 'forward',
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

async function fireBackgroundAction(
  message: string,
  userId: string,
  companyId: string | undefined,
  sessionId: string,
  sessionMessages: Array<{ role: string; content: string }>,
): Promise<void> {
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
}

// =============================================================================
// DIRECT EMAIL REPLY — bypasses /sync LLM chain, calls Composio directly
// =============================================================================

const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");

function parseEmailContext(ctxString: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Parse: [EMAIL_CONTEXT: thread_id=abc message_id=xyz from=john@co.com subject=Urgent: Q4]
  const inner = ctxString.match(/\[EMAIL_CONTEXT:\s*([^\]]+)\]/)?.[1] || '';
  // Split on known keys to handle values with spaces
  const keys = ['thread_id', 'message_id', 'from', 'subject'];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const pattern = nextKey
      ? new RegExp(`${key}=(.+?)\\s+${nextKey}=`)
      : new RegExp(`${key}=(.+)$`);
    const match = inner.match(pattern);
    if (match) result[key] = match[1].trim();
  }
  return result;
}

async function fireEmailReply(
  emailCtxString: string,
  userMessage: string,
  userId: string,
  sessionId: string | undefined,
  sessionMessages: Array<{ role: string; content: string }>,
): Promise<{ success: boolean; detail: string }> {
  try {
    const ctx = parseEmailContext(emailCtxString);
    console.log(`[sync-voice] Email reply — parsed context:`, JSON.stringify(ctx));

      if (!ctx.thread_id && !ctx.message_id && !ctx.from) {
        console.error('[sync-voice] Email reply — no thread_id, message_id, or from. Cannot reply.');
        return { success: false, detail: `No context parsed from: ${emailCtxString.substring(0, 100)}` };
      }

      // 1. Look up user's Gmail connected account
      const { data: gmailConn } = await supabase
        .from('user_integrations')
        .select('composio_connected_account_id')
        .eq('user_id', userId)
        .eq('toolkit_slug', 'gmail')
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!gmailConn?.composio_connected_account_id) {
        console.error('[sync-voice] Email reply — no active Gmail connection for user');
        return { success: false, detail: 'No active Gmail connection for user' };
      }

      // 2. Generate reply body from user's message using quick LLM call
      const replyPrompt = [
        { role: 'system', content: `You are writing a brief, professional email reply. The user told you what to say. Write ONLY the email body text — no subject line, no greeting like "Hi" unless the user specified one, no signature. Keep it natural and concise. Just the reply text.` },
        { role: 'user', content: `Original email from: ${ctx.from || 'someone'}\nSubject: ${ctx.subject || 'N/A'}\n\nThe user wants to reply with: "${userMessage}"\n\nWrite the email reply body:` },
      ];

      const llmRes = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          messages: replyPrompt,
          temperature: 0.5,
          max_tokens: 200,
          stream: false,
        }),
      });

      let replyBody = userMessage; // fallback to raw user message
      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const generated = llmData.choices?.[0]?.message?.content?.trim();
        if (generated) replyBody = generated;
      }

      console.log(`[sync-voice] Email reply body: "${replyBody.substring(0, 80)}..."`);

      // 3. Call Composio API directly to send the reply
      // Extract clean email from "Name <email>" format
      const fromEmail = ctx.from?.match(/<([^>]+)>/)?.[1] || ctx.from || '';

      // GMAIL_REPLY_TO_THREAD requires: thread_id, message_body, recipient_email
      const composioArgs: Record<string, unknown> = {
        message_body: replyBody,
        recipient_email: fromEmail,
        user_id: 'me',
      };
      if (ctx.thread_id) {
        composioArgs.thread_id = ctx.thread_id;
      } else {
        // No thread_id — fall back to GMAIL_SEND_EMAIL instead of reply
        console.log('[sync-voice] No thread_id — falling back to GMAIL_SEND_EMAIL');
      }

      const toolSlug = ctx.thread_id ? 'GMAIL_REPLY_TO_THREAD' : 'GMAIL_SEND_EMAIL';

      // For GMAIL_SEND_EMAIL, use different param names
      if (toolSlug === 'GMAIL_SEND_EMAIL') {
        delete composioArgs.message_body;
        // GMAIL_SEND_EMAIL uses: recipient_email, body, subject
        composioArgs.body = replyBody;
        composioArgs.subject = `Re: ${ctx.subject || ''}`;
      }

      console.log(`[sync-voice] Calling ${toolSlug} with args:`, JSON.stringify(composioArgs).substring(0, 200));

      const composioRes = await fetch(`${SUPABASE_URL}/functions/v1/composio-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'executeTool',
          toolSlug,
          connectedAccountId: gmailConn.composio_connected_account_id,
          arguments: composioArgs,
        }),
      });

      const composioData = await composioRes.json();
      const resultJson = JSON.stringify(composioData).substring(0, 300);
      console.log(`[sync-voice] Email reply Composio result:`, resultJson);

      // 4. Save result to session
      const sent = composioData.success !== false;
      if (sessionId) {
        const resultMsg = sent
          ? `[Action completed]: Email reply sent to ${ctx.from || 'recipient'}`
          : `[Action failed]: Could not send email reply — ${composioData.error || 'unknown error'}`;
        saveToSession(sessionId, [
          ...sessionMessages,
          { role: 'system', content: resultMsg },
        ]);
      }
      return { success: sent, detail: sent ? `Reply sent to ${fromEmail}` : `Composio error: ${resultJson}` };
  } catch (e) {
    console.error('[sync-voice] Email reply error:', e);
    return { success: false, detail: `Exception: ${e instanceof Error ? e.message : String(e)}` };
  }
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
    const body = await req.json();
    const {
      message,
      history = [],
      userId,
      companyId,
      voiceConfig,
      voice: requestedVoice,
      ttsOnly = false,
      ttsText,
    } = body;

    // TTS-only mode: just generate audio for given text (called as second request)
    if (ttsOnly && ttsText) {
      const voice = VALID_VOICES.includes(requestedVoice || voiceConfig?.voice)
        ? (requestedVoice || voiceConfig?.voice)
        : DEFAULT_VOICE;
      const ttsStart = Date.now();
      try {
        const ttsResult = await generateTTS(ttsText, voice);
        console.log(`[sync-voice] TTS-only: ${Date.now() - ttsStart}ms, ${ttsResult.byteLength} bytes`);
        return new Response(
          JSON.stringify({ audio: ttsResult.audio, audioFormat: 'mp3' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch (err) {
        console.error('[sync-voice] TTS-only failed:', err);
        return new Response(
          JSON.stringify({ audio: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

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

    // Extract [EMAIL_CONTEXT: ...] prefix if present — keep raw message for action, clean for LLM
    let emailContext = '';
    let cleanMessage = message;
    const emailCtxMatch = message.match(/^\[EMAIL_CONTEXT:\s*([^\]]+)\]\n?/);
    if (emailCtxMatch) {
      emailContext = emailCtxMatch[0]; // Full prefix including brackets
      cleanMessage = message.slice(emailCtxMatch[0].length).trim();
      console.log(`[sync-voice] Email context detected: ${emailCtxMatch[1].substring(0, 60)}`);
    }

    // When email context is present, be more lenient — any reply/send verb triggers action
    // (user doesn't need to say "reply to the email", just "reply" or "tell him" is enough)
    const EMAIL_REPLY_VERBS = ['reply', 'respond', 'send', 'tell him', 'tell her', 'tell them', 'forward', 'let him know', 'let her know', 'let them know', 'write back', 'get back to'];
    const hasEmailReplyIntent = emailContext && EMAIL_REPLY_VERBS.some(v => cleanMessage.toLowerCase().includes(v));
    const needsAction = isActionRequest(cleanMessage) || hasEmailReplyIntent;
    console.log(`[sync-voice] "${cleanMessage.substring(0, 50)}..." voice=${voice} action=${needsAction} userId=${userId?.substring(0, 8) || 'anon'}`);

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
    // Inject email context into system prompt so LLM knows about the email
    if (emailContext) {
      systemPrompt += `\n\nACTIVE EMAIL CONTEXT:\n${emailContext}The user is responding to this email. If they want to reply, confirm and compose the reply naturally.`;
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

    // Use clean message for LLM (no [EMAIL_CONTEXT] prefix) — context is in system prompt
    messages.push({ role: 'user', content: cleanMessage });

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

    // Fire background action — MUST await before returning or Deno kills the isolate
    let actionPromise: Promise<void | { success: boolean; detail: string }> | null = null;
    let actionType = '';
    if (needsAction && userId && session) {
      const messagesForAction = [
        ...session.messages,
        { role: 'user', content: cleanMessage },
        { role: 'assistant', content: responseText },
      ];

      if (hasEmailReplyIntent && emailContext) {
        // DIRECT email reply — bypasses /sync LLM chain, calls Composio directly
        actionType = 'email_reply';
        actionPromise = fireEmailReply(emailContext, cleanMessage, userId, session.sessionId, messagesForAction);
      } else {
        // Standard background action via /sync
        actionType = 'background_action';
        const actionMessage = emailContext ? `${emailContext}${cleanMessage}` : cleanMessage;
        actionPromise = fireBackgroundAction(actionMessage, userId, companyId, session.sessionId, messagesForAction);
      }
    }

    // Save to session
    if (session) {
      const updatedMessages = [
        ...session.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ];
      saveToSession(session.sessionId, updatedMessages);
    }

    // Wait for action to complete before returning — Deno terminates isolate after response
    let actionResult: unknown = null;
    if (actionPromise) {
      console.log(`[sync-voice] Waiting for ${actionType} to complete...`);
      actionResult = await actionPromise;
      console.log(`[sync-voice] ${actionType} completed:`, JSON.stringify(actionResult));
    }

    const totalTime = Date.now() - startTime;
    console.log(`[sync-voice] Total: ${totalTime}ms (llm=${llmTime}ms)`);

    return new Response(
      JSON.stringify({
        text: responseText,
        response: responseText,
        mood: 'neutral',
        actionPending: needsAction,
        actionResult: actionResult || undefined,
        timing: { total: totalTime, llm: llmTime },
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
