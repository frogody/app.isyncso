import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Dimension interfaces ──────────────────────────────────────

interface WorkStyle {
  chronotype: 'early_bird' | 'standard' | 'night_owl' | 'irregular';
  peak_hours: number[];
  deep_work_ratio: number | null;
  context_switch_rate: number | null;
  focus_score: number | null;
}

interface BusinessRole {
  domain_affinity: Record<string, number>;
  task_completion_rate: number | null;
  delegation_ratio: number | null;
  decision_authority: 'owner' | 'approver' | 'contributor' | 'executor';
}

interface SuggestionReceptivity {
  acceptance_rate: number | null;
  preferred_hours: number[];
  type_affinity: Record<string, number>;
  proactivity: string | null;
  formality: string | null;
  detail_level: string | null;
  suggestion_cooldown_minutes: number;
}

interface SkillGrowth {
  feature_mastery: Record<string, 'expert' | 'proficient' | 'intermediate' | 'novice'>;
  unused_features: string[];
  efficiency_gaps: string[];
}

interface CharacterTraits {
  risk_tolerance: 'high' | 'moderate' | 'low' | 'unknown';
  planning_horizon_days: number | null;
  communication_style: string | null;
  delegation_tendency: 'high' | 'moderate' | 'low' | 'unknown';
}

interface UserProfile {
  user_id: string;
  company_id: string;
  work_style: WorkStyle;
  business_role: BusinessRole;
  suggestion_receptivity: SuggestionReceptivity;
  skill_growth: SkillGrowth;
  character_traits: CharacterTraits;
  profile_completeness: number;
  computed_at: string;
}

// ── Cold-start defaults ───────────────────────────────────────

const COLD_WORK_STYLE: WorkStyle = {
  chronotype: 'standard',
  peak_hours: [9, 10, 11],
  deep_work_ratio: null,
  context_switch_rate: null,
  focus_score: null,
};

const COLD_BUSINESS_ROLE: BusinessRole = {
  domain_affinity: {},
  task_completion_rate: null,
  delegation_ratio: null,
  decision_authority: 'contributor',
};

const COLD_RECEPTIVITY: SuggestionReceptivity = {
  acceptance_rate: null,
  preferred_hours: [9, 10, 14],
  type_affinity: {},
  proactivity: null,
  formality: null,
  detail_level: null,
  suggestion_cooldown_minutes: 30,
};

const COLD_SKILL_GROWTH: SkillGrowth = {
  feature_mastery: {},
  unused_features: [],
  efficiency_gaps: [],
};

const COLD_CHARACTER_TRAITS: CharacterTraits = {
  risk_tolerance: 'unknown',
  planning_horizon_days: null,
  communication_style: null,
  delegation_tendency: 'unknown',
};

// ── Domain categorization map ─────────────────────────────────

const FEATURE_DOMAIN_MAP: Record<string, string> = {
  invoices: 'finance',
  expenses: 'finance',
  proposals: 'finance',
  billing: 'finance',
  financial: 'finance',
  revenue: 'finance',
  prospects: 'sales',
  campaigns: 'sales',
  pipeline: 'sales',
  leads: 'sales',
  crm: 'sales',
  outreach: 'sales',
  products: 'operations',
  inventory: 'operations',
  shipping: 'operations',
  purchasing: 'operations',
  warehouse: 'operations',
  pallets: 'operations',
  tasks: 'productivity',
  calendar: 'productivity',
  scheduling: 'productivity',
  inbox: 'communication',
  messages: 'communication',
  teams: 'management',
  settings: 'management',
  integrations: 'management',
  analytics: 'analytics',
  dashboard: 'analytics',
  reports: 'analytics',
};

// ── Helper: classify feature key into domain ──────────────────

function classifyFeature(featureKey: string): string {
  const lower = featureKey.toLowerCase();
  for (const [keyword, domain] of Object.entries(FEATURE_DOMAIN_MAP)) {
    if (lower.includes(keyword)) return domain;
  }
  return 'other';
}

// ── Helper: top N hours by volume ─────────────────────────────

function topHours(hourCounts: Record<number, number>, n: number): number[] {
  return Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([h]) => parseInt(h));
}

// ── A. Work Style computation ─────────────────────────────────

function computeWorkStyle(
  signatures7d: any[],
  signatures30d: any[],
  activityLogs: any[]
): WorkStyle {
  const style = { ...COLD_WORK_STYLE };

  // Chronotype from activity logs
  if (activityLogs.length > 0) {
    const startHours = activityLogs
      .map((l) => new Date(l.created_at || l.started_at || l.timestamp).getHours())
      .filter((h) => !isNaN(h));

    if (startHours.length > 0) {
      const avgStart = startHours.reduce((a, b) => a + b, 0) / startHours.length;
      if (avgStart < 7.5) style.chronotype = 'early_bird';
      else if (avgStart < 9.5) style.chronotype = 'standard';
      else if (avgStart < 22) style.chronotype = 'night_owl';
      else style.chronotype = 'irregular';
    }

    // Peak hours from activity volume
    const hourCounts: Record<number, number> = {};
    for (const log of activityLogs) {
      const h = new Date(log.created_at || log.started_at || log.timestamp).getHours();
      if (!isNaN(h)) hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    const peaks = topHours(hourCounts, 3);
    if (peaks.length > 0) style.peak_hours = peaks;

    // Focus score from logs
    const focusScores = activityLogs
      .map((l) => l.focus_score)
      .filter((s: any) => typeof s === 'number');
    if (focusScores.length > 0) {
      style.focus_score = Math.round(
        focusScores.reduce((a: number, b: number) => a + b, 0) / focusScores.length
      );
    }
  }

  // Deep work and context switching from behavioral signatures
  const allSigs = [...signatures7d, ...signatures30d];
  for (const sig of allSigs) {
    if (sig.signature_type === 'flow_state_frequency' && sig.signature_data) {
      style.deep_work_ratio = sig.signature_data.ratio ?? sig.signature_data.frequency ?? null;
    }
    if (sig.signature_type === 'context_switching' && sig.signature_data) {
      style.context_switch_rate = sig.signature_data.hourly_rate ?? null;
    }
  }

  return style;
}

// ── B. Business Role computation ──────────────────────────────

function computeBusinessRole(
  featureUsage: any[],
  tasksCreated: any[],
  tasksAssigned: any[],
  hierarchyLevel: number
): BusinessRole {
  const role = { ...COLD_BUSINESS_ROLE };

  // Domain affinity from feature usage
  if (featureUsage.length > 0) {
    const domainCounts: Record<string, number> = {};
    let total = 0;
    for (const fu of featureUsage) {
      const domain = classifyFeature(fu.feature_key || '');
      const count = fu.usage_count || 1;
      domainCounts[domain] = (domainCounts[domain] || 0) + count;
      total += count;
    }
    if (total > 0) {
      role.domain_affinity = {};
      for (const [domain, count] of Object.entries(domainCounts)) {
        role.domain_affinity[domain] = Math.round((count / total) * 100);
      }
    }
  }

  // Task completion rate
  if (tasksAssigned.length > 0) {
    const completed = tasksAssigned.filter(
      (t) => t.status === 'completed' || t.status === 'done'
    ).length;
    role.task_completion_rate = Math.round((completed / tasksAssigned.length) * 100);
  }

  // Delegation ratio
  if (tasksCreated.length > 0) {
    const delegated = tasksCreated.filter(
      (t) => t.assigned_to && t.assigned_to !== t.created_by
    ).length;
    role.delegation_ratio = Math.round((delegated / tasksCreated.length) * 100);
  }

  // Decision authority from RBAC hierarchy level
  if (hierarchyLevel >= 80) role.decision_authority = 'owner';
  else if (hierarchyLevel >= 60) role.decision_authority = 'approver';
  else if (hierarchyLevel >= 40) role.decision_authority = 'contributor';
  else role.decision_authority = 'executor';

  return role;
}

// ── C. Suggestion Receptivity computation ─────────────────────

function computeSuggestionReceptivity(
  pendingActions: any[],
  learnedPrefs: any[]
): SuggestionReceptivity {
  const receptivity = { ...COLD_RECEPTIVITY };

  if (pendingActions.length > 0) {
    // Overall acceptance rate
    const approved = pendingActions.filter(
      (a) => a.status === 'approved' || a.status === 'accepted' || a.status === 'completed'
    );
    receptivity.acceptance_rate = Math.round((approved.length / pendingActions.length) * 100);

    // Type affinity: acceptance rate per action_type
    const typeGroups: Record<string, { total: number; accepted: number }> = {};
    for (const action of pendingActions) {
      const type = action.action_type || 'unknown';
      if (!typeGroups[type]) typeGroups[type] = { total: 0, accepted: 0 };
      typeGroups[type].total++;
      if (['approved', 'accepted', 'completed'].includes(action.status)) {
        typeGroups[type].accepted++;
      }
    }
    receptivity.type_affinity = {};
    for (const [type, counts] of Object.entries(typeGroups)) {
      receptivity.type_affinity[type] = Math.round((counts.accepted / counts.total) * 100);
    }

    // Preferred hours by acceptance rate (min 3 samples per hour)
    const hourAcceptance: Record<number, { total: number; accepted: number }> = {};
    for (const action of pendingActions) {
      const h = new Date(action.created_at || action.suggested_at).getHours();
      if (isNaN(h)) continue;
      if (!hourAcceptance[h]) hourAcceptance[h] = { total: 0, accepted: 0 };
      hourAcceptance[h].total++;
      if (['approved', 'accepted', 'completed'].includes(action.status)) {
        hourAcceptance[h].accepted++;
      }
    }
    const qualifiedHours = Object.entries(hourAcceptance)
      .filter(([, v]) => v.total >= 3)
      .map(([h, v]) => ({ hour: parseInt(h), rate: v.accepted / v.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map((x) => x.hour);
    if (qualifiedHours.length > 0) receptivity.preferred_hours = qualifiedHours;

    // Suggestion cooldown: avg gap between accepted suggestions (in minutes)
    const acceptedTimes = approved
      .map((a) => new Date(a.updated_at || a.created_at).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (acceptedTimes.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < acceptedTimes.length; i++) {
        totalGap += acceptedTimes[i] - acceptedTimes[i - 1];
      }
      const avgGapMs = totalGap / (acceptedTimes.length - 1);
      receptivity.suggestion_cooldown_minutes = Math.round(avgGapMs / 60000);
    }
  }

  // Learned preferences
  if (learnedPrefs.length > 0) {
    for (const pref of learnedPrefs) {
      const key = pref.preference_key || pref.key;
      const val = pref.preference_value || pref.value;
      if (key === 'proactivity') receptivity.proactivity = val;
      if (key === 'formality') receptivity.formality = val;
      if (key === 'detail_level') receptivity.detail_level = val;
    }
  }

  return receptivity;
}

// ── D. Skill & Growth computation ─────────────────────────────

function computeSkillGrowth(
  featureUsage: any[],
  domainAffinity: Record<string, number>
): SkillGrowth {
  const growth = { ...COLD_SKILL_GROWTH, feature_mastery: {}, unused_features: [], efficiency_gaps: [] };

  // Feature mastery levels
  const usageMap: Record<string, number> = {};
  for (const fu of featureUsage) {
    const key = fu.feature_key || '';
    usageMap[key] = (usageMap[key] || 0) + (fu.usage_count || 1);
  }
  for (const [feature, count] of Object.entries(usageMap)) {
    if (count > 50) growth.feature_mastery[feature] = 'expert';
    else if (count > 20) growth.feature_mastery[feature] = 'proficient';
    else if (count > 5) growth.feature_mastery[feature] = 'intermediate';
    else growth.feature_mastery[feature] = 'novice';
  }

  // Domain-related feature suggestions
  const domainFeatureExamples: Record<string, string[]> = {
    finance: ['invoices', 'expenses', 'proposals', 'recurring_invoices', 'financial_reports'],
    sales: ['prospects', 'campaigns', 'pipeline', 'email_outreach', 'lead_scoring'],
    operations: ['products', 'inventory', 'shipping', 'purchasing', 'warehouse'],
    productivity: ['tasks', 'calendar', 'scheduling', 'automations'],
    communication: ['inbox', 'messages', 'notifications'],
    analytics: ['dashboard', 'reports', 'exports'],
  };

  const usedFeatureKeys = new Set(Object.keys(usageMap).map((k) => k.toLowerCase()));

  // Find unused features in active domains
  const topDomains = Object.entries(domainAffinity)
    .filter(([, pct]) => pct >= 15)
    .map(([domain]) => domain);

  for (const domain of topDomains) {
    const examples = domainFeatureExamples[domain] || [];
    for (const feat of examples) {
      if (!usedFeatureKeys.has(feat)) {
        growth.unused_features.push(feat);
      }
    }
  }

  // Efficiency gaps: high-affinity domain but missing key features
  for (const domain of topDomains) {
    const examples = domainFeatureExamples[domain] || [];
    const unused = examples.filter((f) => !usedFeatureKeys.has(f));
    if (unused.length > 0) {
      growth.efficiency_gaps.push(
        `${domain} affinity is ${domainAffinity[domain]}% but never uses: ${unused.join(', ')}`
      );
    }
  }

  return growth;
}

// ── E. Character Traits computation ───────────────────────────

function computeCharacterTraits(
  pendingActions: any[],
  tasks: any[],
  delegationRatio: number | null,
  learnedPrefs: any[]
): CharacterTraits {
  const traits = { ...COLD_CHARACTER_TRAITS };

  // Risk tolerance: acceptance rate of low-confidence suggestions
  if (pendingActions.length > 0) {
    const lowConf = pendingActions.filter(
      (a) => typeof a.confidence === 'number' && a.confidence < 0.7
    );
    if (lowConf.length >= 3) {
      const acceptedLow = lowConf.filter((a) =>
        ['approved', 'accepted', 'completed'].includes(a.status)
      ).length;
      const rate = acceptedLow / lowConf.length;
      if (rate >= 0.6) traits.risk_tolerance = 'high';
      else if (rate >= 0.3) traits.risk_tolerance = 'moderate';
      else traits.risk_tolerance = 'low';
    }
  }

  // Planning horizon: avg days between task creation and due date
  if (tasks.length > 0) {
    const gaps: number[] = [];
    for (const t of tasks) {
      if (t.due_date && t.created_at) {
        const created = new Date(t.created_at).getTime();
        const due = new Date(t.due_date).getTime();
        if (!isNaN(created) && !isNaN(due) && due > created) {
          gaps.push((due - created) / (1000 * 60 * 60 * 24));
        }
      }
    }
    if (gaps.length > 0) {
      traits.planning_horizon_days = Math.round(
        gaps.reduce((a, b) => a + b, 0) / gaps.length
      );
    }
  }

  // Communication style from learned preferences
  for (const pref of learnedPrefs) {
    const key = pref.preference_key || pref.key;
    const val = pref.preference_value || pref.value;
    if (key === 'communication_style' || key === 'formality') {
      traits.communication_style = val;
    }
  }

  // Delegation tendency
  if (delegationRatio !== null) {
    if (delegationRatio >= 50) traits.delegation_tendency = 'high';
    else if (delegationRatio >= 20) traits.delegation_tendency = 'moderate';
    else traits.delegation_tendency = 'low';
  }

  return traits;
}

// ── Profile completeness ──────────────────────────────────────

function computeCompleteness(profile: Omit<UserProfile, 'profile_completeness' | 'computed_at'>): number {
  const checks = [
    profile.work_style.chronotype !== 'standard' || profile.work_style.focus_score !== null,
    profile.work_style.deep_work_ratio !== null,
    profile.work_style.context_switch_rate !== null,
    profile.work_style.focus_score !== null,
    Object.keys(profile.business_role.domain_affinity).length > 0,
    profile.business_role.task_completion_rate !== null,
    profile.business_role.delegation_ratio !== null,
    profile.suggestion_receptivity.acceptance_rate !== null,
    profile.suggestion_receptivity.proactivity !== null,
    profile.suggestion_receptivity.formality !== null,
    profile.suggestion_receptivity.detail_level !== null,
    Object.keys(profile.skill_growth.feature_mastery).length > 0,
    profile.character_traits.risk_tolerance !== 'unknown',
    profile.character_traits.planning_horizon_days !== null,
    profile.character_traits.communication_style !== null,
    profile.character_traits.delegation_tendency !== 'unknown',
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

// ── Compute a single user profile ─────────────────────────────

async function computeProfileForUser(
  supabase: any,
  userId: string,
  companyId: string
): Promise<UserProfile> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // ── Parallel data fetches ─────────────────────────────────
  const results = await Promise.allSettled([
    // 0: behavioral_signatures 7d
    supabase
      .from('behavioral_signatures')
      .select('*')
      .eq('user_id', userId)
      .gte('computed_at', sevenDaysAgo),

    // 1: behavioral_signatures 30d
    supabase
      .from('behavioral_signatures')
      .select('*')
      .eq('user_id', userId)
      .gte('computed_at', thirtyDaysAgo),

    // 2: desktop_activity_logs 30d
    supabase
      .from('desktop_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1000),

    // 3: user_feature_usage
    supabase
      .from('user_feature_usage')
      .select('*')
      .eq('user_id', userId),

    // 4: tasks created by user
    supabase
      .from('tasks')
      .select('id, status, created_by, assigned_to, created_at, due_date')
      .eq('created_by', userId)
      .eq('company_id', companyId),

    // 5: tasks assigned to user
    supabase
      .from('tasks')
      .select('id, status, created_by, assigned_to, created_at, due_date')
      .eq('assigned_to', userId)
      .eq('company_id', companyId),

    // 6: RBAC hierarchy level
    supabase
      .from('rbac_user_roles')
      .select('role_id, rbac_roles(hierarchy_level)')
      .eq('user_id', userId),

    // 7: pending_actions 60d
    supabase
      .from('pending_actions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sixtyDaysAgo),

    // 8: sync_learned_preferences
    supabase
      .from('sync_learned_preferences')
      .select('*')
      .eq('user_id', userId),

    // 9: sync_response_feedback (supplementary)
    supabase
      .from('sync_response_feedback')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo),
  ]);

  // ── Extract data, defaulting to empty arrays on failure ───
  const extract = (idx: number): any[] => {
    const r = results[idx];
    if (r.status === 'fulfilled' && r.value?.data) return r.value.data;
    return [];
  };

  const signatures7d = extract(0);
  const signatures30d = extract(1);
  const activityLogs = extract(2);
  const featureUsage = extract(3);
  const tasksCreated = extract(4);
  const tasksAssigned = extract(5);
  const rbacRoles = extract(6);
  const pendingActions = extract(7);
  const learnedPrefs = extract(8);
  // index 9 (feedback) available for future enrichment

  // Compute hierarchy level
  let hierarchyLevel = 0;
  for (const ur of rbacRoles) {
    const level = ur.rbac_roles?.hierarchy_level ?? 0;
    if (level > hierarchyLevel) hierarchyLevel = level;
  }

  // ── Compute each dimension ────────────────────────────────
  const workStyle = computeWorkStyle(signatures7d, signatures30d, activityLogs);
  const businessRole = computeBusinessRole(featureUsage, tasksCreated, tasksAssigned, hierarchyLevel);
  const suggestionReceptivity = computeSuggestionReceptivity(pendingActions, learnedPrefs);
  const skillGrowth = computeSkillGrowth(featureUsage, businessRole.domain_affinity);
  const characterTraits = computeCharacterTraits(
    pendingActions,
    [...tasksCreated, ...tasksAssigned],
    businessRole.delegation_ratio,
    learnedPrefs
  );

  const partialProfile = {
    user_id: userId,
    company_id: companyId,
    work_style: workStyle,
    business_role: businessRole,
    suggestion_receptivity: suggestionReceptivity,
    skill_growth: skillGrowth,
    character_traits: characterTraits,
  };

  const profile_completeness = computeCompleteness(partialProfile);

  return {
    ...partialProfile,
    profile_completeness,
    computed_at: now.toISOString(),
  };
}

// ── Map profile object to flat DB columns ────────────────────

function profileToRow(p: UserProfile): Record<string, any> {
  const ws = p.work_style;
  const br = p.business_role;
  const sr = p.suggestion_receptivity;
  const sg = p.skill_growth;
  const ct = p.character_traits;

  // Primary domain = highest affinity domain
  const primaryDomain = Object.entries(br.domain_affinity)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || null;

  return {
    user_id: p.user_id,
    company_id: p.company_id,

    // Work Style
    chronotype: ws.chronotype,
    peak_productivity_hours: ws.peak_hours,
    avg_focus_score: ws.focus_score,
    context_switch_rate: ws.context_switch_rate,

    // Business Role
    primary_domain: primaryDomain,
    domain_affinity: br.domain_affinity,
    decision_authority_level: br.decision_authority,
    task_completion_rate: br.task_completion_rate,
    delegation_ratio: br.delegation_ratio,

    // Suggestion Receptivity
    suggestion_acceptance_rate: sr.acceptance_rate,
    preferred_suggestion_hours: sr.preferred_hours,
    suggestion_type_affinity: sr.type_affinity,
    proactivity_preference: sr.proactivity || 'unknown',
    formality_preference: sr.formality || 'unknown',
    preferred_detail_level: sr.detail_level || 'unknown',
    suggestion_cooldown_minutes: sr.suggestion_cooldown_minutes,

    // Skill & Growth
    feature_mastery: sg.feature_mastery,
    unused_features: sg.unused_features,
    efficiency_gaps: sg.efficiency_gaps,

    // Character Traits
    risk_tolerance: ct.risk_tolerance || 'unknown',
    planning_horizon: ct.planning_horizon_days !== null ? `${ct.planning_horizon_days}d` : 'unknown',
    communication_style: ct.communication_style || 'unknown',
    delegation_tendency: ct.delegation_tendency || 'unknown',

    // Meta
    profile_completeness: p.profile_completeness,
    last_full_compute_at: p.computed_at,
    updated_at: new Date().toISOString(),
  };
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { userId, companyId, batch } = body;

    // ── Batch mode: process all active users ──────────────
    if (batch) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, company_id')
        .not('company_id', 'is', null);

      if (usersErr) throw usersErr;
      if (!users || users.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No active users found', profiles: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profiles: UserProfile[] = [];
      const errors: { userId: string; error: string }[] = [];

      // Process in batches of 10 to avoid overwhelming the DB
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const chunk = users.slice(i, i + batchSize);
        const chunkResults = await Promise.allSettled(
          chunk.map((u: any) => computeProfileForUser(supabase, u.id, u.company_id))
        );
        for (let j = 0; j < chunkResults.length; j++) {
          const r = chunkResults[j];
          if (r.status === 'fulfilled') {
            profiles.push(r.value);
          } else {
            errors.push({ userId: chunk[j].id, error: String(r.reason) });
          }
        }
      }

      // Bulk upsert all computed profiles — map to flat columns
      if (profiles.length > 0) {
        const { error: upsertErr } = await supabase
          .from('user_intelligence_profiles')
          .upsert(
            profiles.map((p) => profileToRow(p)),
            { onConflict: 'user_id' }
          );

        if (upsertErr) throw upsertErr;
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: profiles.length,
          failed: errors.length,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Single user mode ──────────────────────────────────
    if (!userId || !companyId) {
      return new Response(
        JSON.stringify({ error: 'userId and companyId are required (or set batch: true)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profile = await computeProfileForUser(supabase, userId, companyId);

    // Upsert into user_intelligence_profiles — map to flat columns
    const { error: upsertErr } = await supabase
      .from('user_intelligence_profiles')
      .upsert(profileToRow(profile), { onConflict: 'user_id' });

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ success: true, profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('compute-user-profile error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
