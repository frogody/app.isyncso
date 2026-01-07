/**
 * Sentinel (AI Compliance) Tool Functions for SYNC
 *
 * Actions:
 * - register_ai_system
 * - list_ai_systems
 * - get_compliance_status
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Sentinel Types
// ============================================================================

interface AISystemData {
  name: string;
  description?: string;
  type?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  vendor?: string;
  purpose?: string;
}

// Risk level descriptions for EU AI Act compliance
const RISK_LEVELS = {
  low: 'Minimal risk - No specific requirements',
  medium: 'Limited risk - Transparency obligations',
  high: 'High risk - Full compliance requirements',
  critical: 'Unacceptable risk - May be prohibited',
};

// ============================================================================
// Register AI System
// ============================================================================

export async function registerAISystem(
  ctx: ActionContext,
  data: AISystemData
): Promise<ActionResult> {
  try {
    const systemRecord = {
      company_id: ctx.companyId || null,
      name: data.name,
      description: data.description || null,
      type: data.type || 'general',
      risk_level: data.risk_level || 'low',
      vendor: data.vendor || null,
      purpose: data.purpose || null,
      status: 'registered',
      compliance_status: 'pending_review',
      metadata: {},
    };

    const { data: system, error } = await ctx.supabase
      .from('ai_systems')
      .insert(systemRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to register AI system: ${error.message}`, error.message);
    }

    const riskInfo = RISK_LEVELS[data.risk_level || 'low'];

    return successResult(
      `✅ AI System Registered!\n\n**${system.name}**\n- Type: ${system.type}\n- Risk Level: ${system.risk_level}\n- ${riskInfo}\n- Status: Pending Review`,
      system,
      '/sentinel'
    );
  } catch (err) {
    return errorResult(`Exception registering AI system: ${String(err)}`, String(err));
  }
}

// ============================================================================
// List AI Systems
// ============================================================================

export async function listAISystems(
  ctx: ActionContext,
  data: { risk_level?: string; status?: string; limit?: number } = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('ai_systems')
      .select('id, name, type, risk_level, status, compliance_status, created_at')
      .order('created_at', { ascending: false })
      .limit(data.limit || 20);

    if (data.risk_level) {
      query = query.eq('risk_level', data.risk_level);
    }
    if (data.status) {
      query = query.eq('status', data.status);
    }
    if (ctx.companyId) {
      query = query.eq('company_id', ctx.companyId);
    }

    const { data: systems, error } = await query;

    if (error) {
      return errorResult(`Failed to list AI systems: ${error.message}`, error.message);
    }

    if (!systems || systems.length === 0) {
      return successResult('No AI systems registered. Use "register ai system" to add one.', []);
    }

    const riskEmoji: Record<string, string> = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const list = formatList(systems, (s) => {
      const emoji = riskEmoji[s.risk_level] || '⚪';
      return `- ${emoji} **${s.name}** | ${s.type} | ${s.risk_level} risk | ${s.compliance_status}`;
    });

    return successResult(
      `Found ${systems.length} AI system(s):\n\n${list}`,
      systems,
      '/sentinel'
    );
  } catch (err) {
    return errorResult(`Exception listing AI systems: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Compliance Status
// ============================================================================

export async function getComplianceStatus(
  ctx: ActionContext,
  data: {} = {}
): Promise<ActionResult> {
  try {
    // Get all systems and calculate compliance overview
    const { data: systems, error } = await ctx.supabase
      .from('ai_systems')
      .select('id, name, risk_level, compliance_status');

    if (error) {
      return errorResult(`Failed to get compliance status: ${error.message}`, error.message);
    }

    if (!systems || systems.length === 0) {
      return successResult(
        '📋 No AI systems registered.\n\nRegister your AI systems to track compliance with EU AI Act and other regulations.',
        { total: 0, compliant: 0, pending: 0, non_compliant: 0 },
        '/sentinel'
      );
    }

    const stats = {
      total: systems.length,
      compliant: systems.filter(s => s.compliance_status === 'compliant').length,
      pending: systems.filter(s => s.compliance_status === 'pending_review').length,
      non_compliant: systems.filter(s => s.compliance_status === 'non_compliant').length,
      by_risk: {
        low: systems.filter(s => s.risk_level === 'low').length,
        medium: systems.filter(s => s.risk_level === 'medium').length,
        high: systems.filter(s => s.risk_level === 'high').length,
        critical: systems.filter(s => s.risk_level === 'critical').length,
      },
    };

    const compliancePercent = stats.total > 0
      ? Math.round((stats.compliant / stats.total) * 100)
      : 0;

    const statusEmoji = compliancePercent >= 80 ? '✅' : compliancePercent >= 50 ? '⚠️' : '🚨';

    return successResult(
      `${statusEmoji} **Compliance Overview**\n\n` +
      `- Total Systems: ${stats.total}\n` +
      `- Compliant: ${stats.compliant} (${compliancePercent}%)\n` +
      `- Pending Review: ${stats.pending}\n` +
      `- Non-Compliant: ${stats.non_compliant}\n\n` +
      `**By Risk Level:**\n` +
      `- 🟢 Low: ${stats.by_risk.low}\n` +
      `- 🟡 Medium: ${stats.by_risk.medium}\n` +
      `- 🟠 High: ${stats.by_risk.high}\n` +
      `- 🔴 Critical: ${stats.by_risk.critical}`,
      stats,
      '/sentinel'
    );
  } catch (err) {
    return errorResult(`Exception getting compliance status: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Sentinel Action Router
// ============================================================================

export async function executeSentinelAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'register_ai_system':
      return registerAISystem(ctx, data);
    case 'list_ai_systems':
      return listAISystems(ctx, data);
    case 'get_compliance_status':
      return getComplianceStatus(ctx, data);
    default:
      return errorResult(`Unknown sentinel action: ${action}`, 'Unknown action');
  }
}
