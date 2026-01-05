// Use shared supabase client to avoid multiple GoTrueClient instances
import { supabase } from '@/api/supabaseClient';

export { supabase };

export function getSupabase() {
  return supabase;
}

// Real-time subscription for events
export function subscribeToEvents(sessionId, callback) {
  return supabase
    .channel(`sync_events_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_events',
        filter: `session_id=eq.${sessionId}`
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// Fetch recent events
export async function fetchEvents(sessionId, limit = 50) {
  const { data, error } = await supabase
    .from('sync_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
}

// Send action to extension
export async function sendAction(sessionId, actionType, actionData) {
  const { data, error } = await supabase
    .from('sync_actions')
    .insert({
      session_id: sessionId,
      action_type: actionType,
      action_data: actionData,
      status: 'pending'
    })
    .select()
    .single();
  
  return { data, error };
}

// Send Claude prompt
export async function sendClaudePrompt(sessionId, prompt) {
  return sendAction(sessionId, 'claude_prompt', { prompt });
}

// Get action status
export async function getActionStatus(actionId) {
  const { data, error } = await supabase
    .from('sync_actions')
    .select('*')
    .eq('id', actionId)
    .single();
  
  return { data, error };
}

// Register/validate session ID (creates entry so extension can find it)
export async function registerSession(sessionId, userId, userEmail) {
  // First check if session exists
  const { data: existing } = await supabase
    .from('sync_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (existing) {
    // Update last_active
    const { data, error } = await supabase
      .from('sync_sessions')
      .update({ 
        last_active: new Date().toISOString(),
        status: 'active'
      })
      .eq('session_id', sessionId)
      .select()
      .single();
    return { data, error, isNew: false };
  }
  
  // Create new session
  const { data, error } = await supabase
    .from('sync_sessions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      user_email: userEmail,
      status: 'active',
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    })
    .select()
    .single();
  
  return { data, error, isNew: true };
}

// Check if session exists
export async function checkSession(sessionId) {
  const { data, error } = await supabase
    .from('sync_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  return { data, error, exists: !!data };
}