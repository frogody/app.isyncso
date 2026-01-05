/**
 * Supabase Client - Replaces Base44 SDK
 *
 * This module provides a Base44-compatible interface using Supabase as the backend.
 * It maintains API compatibility while migrating from Base44 to Supabase.
 *
 * Usage:
 *   import { supabase, entities, auth, functions } from '@/api/supabaseClient';
 *
 *   // Entity operations (same interface as Base44)
 *   const candidates = await entities.Candidate.list();
 *   const candidate = await entities.Candidate.create({ first_name: 'John' });
 *   await entities.Candidate.update(id, { contacted: true });
 *   await entities.Candidate.delete(id);
 *
 *   // Auth operations
 *   const user = await auth.me();
 *   await auth.signOut();
 *
 *   // Edge functions
 *   const result = await functions.invoke('generateIntelligence', { candidate_id: '...' });
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

/**
 * Create a Base44-compatible entity wrapper for a Supabase table
 */
const createEntityWrapper = (tableName) => {
  return {
    /**
     * List all records (with optional sorting and limit)
     */
    async list(orderBy = '-created_date', limit = 100) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '');

      let query = supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error(`Error listing ${tableName}:`, error);
        throw error;
      }

      return data || [];
    },

    /**
     * Filter records by criteria
     */
    async filter(criteria, orderBy = '-created_date', limit = 100) {
      const ascending = !orderBy.startsWith('-');
      const column = orderBy.replace(/^-/, '');

      let query = supabase
        .from(tableName)
        .select('*');

      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Handle array values (IN clause)
          query = query.in(key, value);
        } else if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
      });

      query = query.order(column, { ascending }).limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error(`Error filtering ${tableName}:`, error);
        throw error;
      }

      return data || [];
    },

    /**
     * Get a single record by ID
     */
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error(`Error getting ${tableName}:`, error);
        throw error;
      }

      return data;
    },

    /**
     * Create a new record
     */
    async create(data) {
      // Add timestamps if not present
      const now = new Date().toISOString();
      const record = {
        ...data,
        created_date: data.created_date || now,
        updated_date: data.updated_date || now
      };

      const { data: created, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${tableName}:`, error);
        throw error;
      }

      return created;
    },

    /**
     * Update an existing record
     */
    async update(id, updates) {
      const record = {
        ...updates,
        updated_date: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(tableName)
        .update(record)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${tableName}:`, error);
        throw error;
      }

      return data;
    },

    /**
     * Delete a record
     */
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting ${tableName}:`, error);
        throw error;
      }

      return true;
    },

    /**
     * Upsert (create or update)
     */
    async upsert(data, conflictColumns = ['id']) {
      const record = {
        ...data,
        updated_date: new Date().toISOString()
      };

      if (!record.created_date) {
        record.created_date = record.updated_date;
      }

      const { data: upserted, error } = await supabase
        .from(tableName)
        .upsert(record, { onConflict: conflictColumns.join(',') })
        .select()
        .single();

      if (error) {
        console.error(`Error upserting ${tableName}:`, error);
        throw error;
      }

      return upserted;
    },

    /**
     * Count records matching criteria
     */
    async count(criteria = {}) {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      Object.entries(criteria).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value === null) {
          query = query.is(key, null);
        } else {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        console.error(`Error counting ${tableName}:`, error);
        throw error;
      }

      return count || 0;
    },

    /**
     * Subscribe to real-time changes
     */
    subscribe(callback, filter = '*') {
      const channel = supabase
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          { event: filter, schema: 'public', table: tableName },
          (payload) => callback(payload)
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  };
};

// Entity wrappers (matching Base44 entity names)
export const entities = {
  Candidate: createEntityWrapper('candidates'),
  Campaign: createEntityWrapper('campaigns'),
  Project: createEntityWrapper('projects'),
  Role: createEntityWrapper('roles'),
  Task: createEntityWrapper('tasks'),
  Organization: createEntityWrapper('organizations'),
  ChatConversation: createEntityWrapper('chat_conversations'),
  OutreachMessage: createEntityWrapper('outreach_messages'),
  UserInvitation: createEntityWrapper('user_invitations'),
  RegenerationJob: createEntityWrapper('regeneration_jobs'),
  Client: createEntityWrapper('clients'),
  OutreachTask: createEntityWrapper('outreach_tasks'),
  IntelligenceProgress: createEntityWrapper('intelligence_progress'),
  ChatProgress: createEntityWrapper('chat_progress'),
  Team: createEntityWrapper('teams'),
  TeamMember: createEntityWrapper('team_members'),

  // SkillSync entities (for shared backend)
  User: createEntityWrapper('users'),
  UserProfile: createEntityWrapper('user_profiles'),
  Activity: createEntityWrapper('activities'),
  MicroLesson: createEntityWrapper('micro_lessons'),
  SkillCatalog: createEntityWrapper('skill_catalog'),
  UserSkillProgress: createEntityWrapper('user_skill_progress'),
  CourseCatalog: createEntityWrapper('course_catalog'),
  CourseEnrollment: createEntityWrapper('course_enrollments'),
  Achievement: createEntityWrapper('achievements')
};

// Auth wrapper (Base44-compatible interface)
export const auth = {
  /**
   * Get current user (Base44 me() equivalent)
   */
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Get extended user data from users table
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    return {
      id: userData?.id || user.id,
      auth_id: user.id,
      email: user.email,
      full_name: userData?.full_name || user.user_metadata?.full_name,
      avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url,
      organization_id: userData?.organization_id,
      role: userData?.role || 'user',
      language: userData?.language || 'en',
      ...userData
    };
  },

  /**
   * Sign in with email/password
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign up with email/password
   */
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Logout (Base44 alias for signOut)
   */
  async logout() {
    return this.signOut();
  },

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update auth metadata
    await supabase.auth.updateUser({
      data: updates
    });

    // Update users table
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Get session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Login with redirect (Base44 compatibility)
   * Redirects to Supabase Auth UI or OAuth flow
   */
  async loginWithRedirect(callbackUrl) {
    // Store callback URL for after auth
    if (callbackUrl) {
      localStorage.setItem('auth_callback_url', callbackUrl);
    }

    // Redirect to Supabase Auth UI (configured in Supabase dashboard)
    const redirectTo = `${window.location.origin}/auth/callback`;

    // Use Google OAuth by default (can be customized)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Handle auth callback (after OAuth redirect)
   */
  async handleAuthCallback() {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    // Check for stored callback URL
    const callbackUrl = localStorage.getItem('auth_callback_url');
    if (callbackUrl) {
      localStorage.removeItem('auth_callback_url');
      window.location.href = callbackUrl;
      return data;
    }

    return data;
  },

  /**
   * Reset password
   */
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    if (error) throw error;
    return data;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }
};

// Cloud functions wrapper (using Edge Functions or local implementations)
export const functions = {
  /**
   * Invoke an edge function
   */
  async invoke(functionName, params = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params
    });

    if (error) {
      console.error(`Error invoking function ${functionName}:`, error);
      throw error;
    }

    return { data, error: null };
  }
};

// Storage wrapper
export const storage = {
  /**
   * Upload a file
   */
  async upload(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) throw error;
    return data;
  },

  /**
   * Get public URL
   */
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * Download a file
   */
  async download(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  },

  /**
   * Delete a file
   */
  async delete(bucket, paths) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    const { error } = await supabase.storage
      .from(bucket)
      .remove(pathArray);

    if (error) throw error;
    return true;
  },

  /**
   * List files in a bucket
   */
  async list(bucket, path = '', options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, options);

    if (error) throw error;
    return data;
  }
};

// Real-time subscriptions
export const realtime = {
  /**
   * Subscribe to a channel
   */
  channel(name) {
    return supabase.channel(name);
  },

  /**
   * Remove a channel
   */
  removeChannel(channel) {
    return supabase.removeChannel(channel);
  },

  /**
   * Subscribe to table changes
   */
  onTableChange(table, callback, event = '*') {
    const channel = supabase
      .channel(`${table}_realtime`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};

// Export a Base44-compatible interface
export const isyncso = {
  entities,
  auth,
  functions: {
    invoke: functions.invoke,
    // Add individual function exports for compatibility
    async generateCandidateIntelligence(params) {
      return functions.invoke('generateCandidateIntelligence', params);
    },
    async generateOutreachMessage(params) {
      return functions.invoke('generateOutreachMessage', params);
    },
    async assignCandidateRoundRobin(params) {
      return functions.invoke('assignCandidateRoundRobin', params);
    },
    async analyzeCampaignProject(params) {
      return functions.invoke('analyzeCampaignProject', params);
    }
  },
  storage,
  realtime
};

export default isyncso;
