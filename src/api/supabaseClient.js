/**
 * Supabase Client - Replaces Base44 SDK
 *
 * This module provides a Base44-compatible interface using Supabase as the backend.
 * It maintains API compatibility while migrating from Base44 to Supabase.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hktkopulegnmdszxkwld.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdGtvcHVsZWdubWRzenhrd2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYyMTksImV4cCI6MjA3NjY1MjIxOX0.UWR9I3g2a7ZKQObpbYZezmPqR_dGrxFqVd6jr_Yp_W8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Convert snake_case table name to entity name
 */
const tableNameMap = {
  // === SkillSync Activity Tracking Tables ===
  // These tables receive data from the SkillSync macOS app
  'Activity': 'activities',                    // Core activity captures (every 5-6 seconds)
  'DeepContent': 'deep_content',               // Rich content captures (emails, code, documents)
  'MissingAction': 'missing_actions',          // AI-detected follow-up suggestions
  'MicroLesson': 'micro_lessons',              // AI-generated lessons from activity analysis
  'ActivitySummary': 'activity_summaries',     // Aggregated activity analytics
  'UserProfile': 'user_profiles',              // User behavior profiles
  'CompanyDataCache': 'company_data_cache',    // Company enrichment data

  // === Learning Management Tables ===
  'Course': 'courses',
  'Module': 'modules',
  'Lesson': 'lessons',
  'UserProgress': 'user_progress',
  'Assessment': 'assessments',
  'UserResult': 'user_results',
  'CourseBuild': 'course_builds',
  'ContentAsset': 'content_assets',
  'CourseVersion': 'course_versions',
  'CourseRating': 'course_ratings',
  'LessonInteraction': 'lesson_interactions',

  // === Organization Tables ===
  'Company': 'companies',
  'Department': 'departments',
  'Invitation': 'invitations',
  'Assignment': 'assignments',

  // === Skills & Learning Paths ===
  'Skill': 'skills',
  'CourseSkill': 'course_skills',
  'LearningPath': 'learning_paths',
  'LearningPathStep': 'learning_path_steps',
  'SkillsMaster': 'skills_master',
  'SkillApplication': 'skill_applications',
  'LearningIndicator': 'learning_indicators',
  'UserSkillProgress': 'user_skill_progress',
  'SkillGap': 'skill_gaps',
  'CourseRecommendation': 'course_recommendations',
  'PracticeChallenge': 'practice_challenges',
  'UserSkill': 'user_skills',

  // === Compliance & Sentinel ===
  'ComplianceRequirement': 'compliance_requirements',
  'RegulatoryDocument': 'regulatory_documents',
  'AISystem': 'ai_systems',
  'Obligation': 'obligations',

  // === Growth Engine Tables ===
  'Prospect': 'prospects',
  'ProspectList': 'prospect_lists',
  'ProspectListMembership': 'prospect_list_memberships',
  'ICPTemplate': 'icp_templates',
  'GrowthMetric': 'growth_metrics',
  'GrowthCampaign': 'growth_campaigns',
  'GrowthOpportunity': 'growth_opportunities',
  'GrowthSignal': 'growth_signals',

  // === Gamification & Achievements ===
  'UserGamification': 'user_gamification',
  'Badge': 'badges',
  'Certificate': 'certificates',

  // === User & Settings ===
  'UserSettings': 'user_settings',
  'UserAppConfig': 'user_app_configs',

  // === Support ===
  'SupportTicket': 'support_tickets',
  'FeatureRequest': 'feature_requests',
  'HelpArticle': 'help_articles',

  // === Sync & Sessions ===
  'ActivitySession': 'activity_sessions',
  'SyncSession': 'sync_sessions',
  'SyncEvent': 'sync_events',
  'SyncAction': 'sync_actions',

  // === Communication ===
  'Channel': 'channels',
  'Message': 'messages',

  // === Integrations & Actions ===
  'MergeIntegration': 'merge_integrations',
  'ActionLog': 'action_logs',
  'MasterPromptTemplate': 'master_prompt_templates',

  // === CIDE (Content IDE) ===
  'CIDEDraft': 'cide_drafts',
};

/**
 * Create a Base44-compatible entity wrapper for a Supabase table
 */
function createEntityWrapper(entityName) {
  const tableName = tableNameMap[entityName] || entityName.toLowerCase() + 's';

  return {
    /**
     * List all records
     */
    async list(options = {}) {
      try {
        let query = supabase.from(tableName).select('*');

        if (options.order) {
          query = query.order(options.order.column || 'created_at', {
            ascending: options.order.ascending ?? false
          });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.list error:`, error);
        return [];
      }
    },

    /**
     * Filter records by criteria
     */
    async filter(filters = {}, options = {}) {
      try {
        let query = supabase.from(tableName).select('*');

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        });

        // Apply ordering
        if (options.order) {
          query = query.order(options.order.column || 'created_at', {
            ascending: options.order.ascending ?? false
          });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.filter error:`, error);
        return [];
      }
    },

    /**
     * Get a single record by ID
     */
    async get(id) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.get error:`, error);
        return null;
      }
    },

    /**
     * Create a new record
     */
    async create(data) {
      try {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        return result;
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.create error:`, error);
        throw error;
      }
    },

    /**
     * Update a record by ID
     */
    async update(id, updates) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.update error:`, error);
        throw error;
      }
    },

    /**
     * Delete a record by ID
     */
    async delete(id) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error(`[supabaseClient] ${entityName}.delete error:`, error);
        throw error;
      }
    }
  };
}

/**
 * Entity wrappers (matching Base44 entity names)
 */
export const entities = {
  // === SkillSync Activity Tracking (receives data from macOS app) ===
  Activity: createEntityWrapper('Activity'),
  DeepContent: createEntityWrapper('DeepContent'),
  MissingAction: createEntityWrapper('MissingAction'),
  MicroLesson: createEntityWrapper('MicroLesson'),
  ActivitySummary: createEntityWrapper('ActivitySummary'),
  UserProfile: createEntityWrapper('UserProfile'),
  CompanyDataCache: createEntityWrapper('CompanyDataCache'),

  // === Learning Management ===
  Course: createEntityWrapper('Course'),
  Module: createEntityWrapper('Module'),
  Lesson: createEntityWrapper('Lesson'),
  UserProgress: createEntityWrapper('UserProgress'),
  Assessment: createEntityWrapper('Assessment'),
  UserResult: createEntityWrapper('UserResult'),
  CourseBuild: createEntityWrapper('CourseBuild'),
  ContentAsset: createEntityWrapper('ContentAsset'),
  CourseVersion: createEntityWrapper('CourseVersion'),
  CourseRating: createEntityWrapper('CourseRating'),
  LessonInteraction: createEntityWrapper('LessonInteraction'),

  // === Organization ===
  Company: createEntityWrapper('Company'),
  Department: createEntityWrapper('Department'),
  Invitation: createEntityWrapper('Invitation'),
  Assignment: createEntityWrapper('Assignment'),

  // === Skills & Learning Paths ===
  Skill: createEntityWrapper('Skill'),
  CourseSkill: createEntityWrapper('CourseSkill'),
  LearningPath: createEntityWrapper('LearningPath'),
  LearningPathStep: createEntityWrapper('LearningPathStep'),
  SkillsMaster: createEntityWrapper('SkillsMaster'),
  SkillApplication: createEntityWrapper('SkillApplication'),
  LearningIndicator: createEntityWrapper('LearningIndicator'),
  UserSkillProgress: createEntityWrapper('UserSkillProgress'),
  SkillGap: createEntityWrapper('SkillGap'),
  CourseRecommendation: createEntityWrapper('CourseRecommendation'),
  PracticeChallenge: createEntityWrapper('PracticeChallenge'),
  UserSkill: createEntityWrapper('UserSkill'),

  // === Compliance & Sentinel ===
  ComplianceRequirement: createEntityWrapper('ComplianceRequirement'),
  RegulatoryDocument: createEntityWrapper('RegulatoryDocument'),
  AISystem: createEntityWrapper('AISystem'),
  Obligation: createEntityWrapper('Obligation'),

  // === Growth Engine ===
  Prospect: createEntityWrapper('Prospect'),
  ProspectList: createEntityWrapper('ProspectList'),
  ProspectListMembership: createEntityWrapper('ProspectListMembership'),
  ICPTemplate: createEntityWrapper('ICPTemplate'),
  GrowthMetric: createEntityWrapper('GrowthMetric'),
  GrowthCampaign: createEntityWrapper('GrowthCampaign'),
  GrowthOpportunity: createEntityWrapper('GrowthOpportunity'),
  GrowthSignal: createEntityWrapper('GrowthSignal'),

  // === Gamification & Achievements ===
  UserGamification: createEntityWrapper('UserGamification'),
  Badge: createEntityWrapper('Badge'),
  Certificate: createEntityWrapper('Certificate'),

  // === User & Settings ===
  UserSettings: createEntityWrapper('UserSettings'),
  UserAppConfig: createEntityWrapper('UserAppConfig'),

  // === Support ===
  SupportTicket: createEntityWrapper('SupportTicket'),
  FeatureRequest: createEntityWrapper('FeatureRequest'),
  HelpArticle: createEntityWrapper('HelpArticle'),

  // === Sync & Sessions ===
  ActivitySession: createEntityWrapper('ActivitySession'),
  SyncSession: createEntityWrapper('SyncSession'),
  SyncEvent: createEntityWrapper('SyncEvent'),
  SyncAction: createEntityWrapper('SyncAction'),

  // === Communication ===
  Channel: createEntityWrapper('Channel'),
  Message: createEntityWrapper('Message'),

  // === Integrations & Actions ===
  MergeIntegration: createEntityWrapper('MergeIntegration'),
  ActionLog: createEntityWrapper('ActionLog'),
  MasterPromptTemplate: createEntityWrapper('MasterPromptTemplate'),

  // === CIDE (Content IDE) ===
  CIDEDraft: createEntityWrapper('CIDEDraft'),
};

/**
 * Auth wrapper (Base44-compatible interface)
 */
export const auth = {
  /**
   * Get current user (Base44 me() equivalent)
   */
  async me() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Get extended user profile from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        role: profile?.role || 'user',
        company_id: profile?.company_id,
        department_id: profile?.department_id,
        credits: profile?.credits || 0,
        language: profile?.language || 'en',
        ...profile
      };
    } catch (error) {
      console.error('[supabaseClient] auth.me error:', error);
      return null;
    }
  },

  /**
   * Update current user profile
   */
  async updateMe(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[supabaseClient] auth.updateMe error:', error);
      throw error;
    }
  },

  /**
   * Sign out
   */
  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  },

  /**
   * Redirect to login
   */
  redirectToLogin(returnUrl = window.location.href) {
    // Store return URL for after login
    localStorage.setItem('returnUrl', returnUrl);
    window.location.href = '/login';
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

/**
 * Functions wrapper (for edge functions)
 */
export const functions = {
  /**
   * Invoke an edge function
   */
  async invoke(functionName, params = {}) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`[supabaseClient] functions.invoke(${functionName}) error:`, error);
      return { data: null, error };
    }
  }
};

/**
 * Storage wrapper
 */
export const storage = {
  /**
   * Upload a file
   */
  async upload(bucket, path, file) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { path: data.path, url: publicUrl };
    } catch (error) {
      console.error('[supabaseClient] storage.upload error:', error);
      throw error;
    }
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket, path) {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return publicUrl;
  }
};

/**
 * Agents wrapper (placeholder for Base44 agents API)
 * Note: This requires implementation of agent functionality in Supabase
 */
export const agents = {
  async listConversations(agentName) {
    console.warn('[supabaseClient] agents.listConversations not fully implemented');
    return [];
  },

  async createConversation(agentName, params = {}) {
    console.warn('[supabaseClient] agents.createConversation not fully implemented');
    return { id: crypto.randomUUID(), messages: [] };
  },

  async addMessage(conversationId, message) {
    console.warn('[supabaseClient] agents.addMessage not fully implemented');
    return { id: crypto.randomUUID(), ...message };
  },

  async updateConversation(conversationId, updates) {
    console.warn('[supabaseClient] agents.updateConversation not fully implemented');
    return { id: conversationId, ...updates };
  },

  getWhatsAppConnectURL(agentId) {
    // WhatsApp integration not available with Supabase backend
    return null;
  }
};

/**
 * Integrations wrapper
 */
export const integrations = {
  Core: {
    async InvokeLLM(params) {
      // Use Grok (xAI) as the LLM provider
      return functions.invoke('invokeGrok', params);
    },

    async SendEmail(params) {
      return functions.invoke('sendEmail', params);
    },

    async UploadFile({ file, bucket = 'uploads' }) {
      const path = `${Date.now()}_${file.name}`;
      return storage.upload(bucket, path, file);
    },

    async GenerateImage(params) {
      return functions.invoke('generateImage', params);
    },

    async ExtractDataFromUploadedFile(params) {
      return functions.invoke('extractDataFromUploadedFile', params);
    },

    async CreateFileSignedUrl(params) {
      return functions.invoke('createFileSignedUrl', params);
    },

    async UploadPrivateFile({ file, bucket = 'private' }) {
      const path = `${Date.now()}_${file.name}`;
      return storage.upload(bucket, path, file);
    }
  }
};

/**
 * Base44-compatible client export
 * This provides the same interface as the Base44 SDK
 */
export const base44 = {
  entities,
  auth,
  functions,
  storage,
  agents,
  integrations
};

export default base44;
