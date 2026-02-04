/**
 * Flow Test Utilities
 * Testing tools for flow development and debugging
 */

import { supabase } from '@/api/supabaseClient';
import { startFlowExecution } from './flowExecutionEngine';
import { validateFlow as validateFlowDefinition } from '@/components/flows/flowUtils';

// ============================================================================
// Test Prospect Generation
// ============================================================================

/**
 * Generate mock prospect data for testing
 * @returns {Object} Realistic test prospect
 */
export function generateMockProspect() {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const companies = ['TechCorp', 'InnovateLabs', 'DataDrive', 'CloudFirst', 'ScaleUp Inc', 'GrowthHQ'];
  const titles = ['CEO', 'CTO', 'VP of Engineering', 'Head of Product', 'Director of Sales', 'VP Marketing'];
  const stages = ['lead', 'qualified', 'contacted', 'meeting', 'proposal'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];

  return {
    name: `${firstName} ${lastName}`,
    full_name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
    company: company,
    company_name: company,
    title: titles[Math.floor(Math.random() * titles.length)],
    phone: `+1 (555) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    stage: stages[Math.floor(Math.random() * stages.length)],
    notes: 'Test prospect generated for flow testing',
    tags: ['test', 'demo'],
    source: 'test_generation'
  };
}

/**
 * Generate mock company data for testing
 * @returns {Object} Realistic test company
 */
export function generateMockCompany() {
  const industries = ['Technology', 'SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'EdTech'];
  const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000'];
  const fundingStages = ['Seed', 'Series A', 'Series B', 'Series C', 'Public'];

  return {
    name: `${['Tech', 'Cloud', 'Data', 'AI', 'Smart'][Math.floor(Math.random() * 5)]}${['Corp', 'Labs', 'Solutions', 'Systems', 'Works'][Math.floor(Math.random() * 5)]}`,
    industry: industries[Math.floor(Math.random() * industries.length)],
    size: sizes[Math.floor(Math.random() * sizes.length)],
    founded: 2015 + Math.floor(Math.random() * 8),
    funding_stage: fundingStages[Math.floor(Math.random() * fundingStages.length)],
    revenue_range: ['$1M-$5M', '$5M-$20M', '$20M-$50M', '$50M-$100M'][Math.floor(Math.random() * 4)],
    website: 'https://example.com',
    headquarters: ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA'][Math.floor(Math.random() * 5)],
    description: 'A leading technology company focused on innovation and growth.',
    technologies: ['React', 'Node.js', 'AWS', 'PostgreSQL', 'Python', 'Kubernetes'].slice(0, Math.floor(Math.random() * 4 + 2)),
    recent_news: [
      'Raised $10M in Series A funding',
      'Launched new enterprise product',
      'Expanded team by 50%'
    ].slice(0, Math.floor(Math.random() * 3 + 1))
  };
}

// ============================================================================
// Test Prospect Management
// ============================================================================

/**
 * Create a test prospect in the database
 * @param {Object} overrides - Optional field overrides
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<{success: boolean, prospect?: Object, error?: string}>}
 */
export async function createTestProspect(workspaceId, overrides = {}) {
  try {
    const mockData = generateMockProspect();
    const prospectData = {
      ...mockData,
      ...overrides,
      workspace_id: workspaceId,
      metadata: {
        ...(overrides.metadata || {}),
        test_prospect: true,
        created_for_testing: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, prospect: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Clean up test prospects
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<{success: boolean, deleted: number, error?: string}>}
 */
export async function cleanupTestProspects(workspaceId) {
  try {
    const { data, error } = await supabase
      .from('prospects')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('source', 'test_generation')
      .select();

    if (error) {
      return { success: false, deleted: 0, error: error.message };
    }

    return { success: true, deleted: data?.length || 0 };
  } catch (error) {
    return { success: false, deleted: 0, error: error.message };
  }
}

// ============================================================================
// Test Mode Execution
// ============================================================================

/**
 * Run flow in test mode (doesn't send real emails/SMS)
 * @param {string} flowId - Flow ID to run
 * @param {string} prospectId - Prospect ID to run on
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, execution?: Object, logs: Array, error?: string}>}
 */
export async function runFlowInTestMode(flowId, prospectId, workspaceId, userId) {
  const logs = [];
  const log = (type, message, data = null) => {
    logs.push({
      type,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  try {
    log('info', 'Starting test mode execution');

    // Verify flow exists
    const { data: flow, error: flowError } = await supabase
      .from('outreach_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      return { success: false, logs, error: 'Flow not found' };
    }

    log('info', `Flow loaded: ${flow.name}`);

    // Verify prospect exists
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect) {
      return { success: false, logs, error: 'Prospect not found' };
    }

    log('info', `Prospect loaded: ${prospect.full_name || prospect.name}`);

    // Create execution with test_mode flag
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .insert({
        flow_id: flowId,
        prospect_id: prospectId,
        workspace_id: workspaceId,
        started_by: userId,
        status: 'pending',
        execution_context: {
          test_mode: true,
          prospect: {
            id: prospect.id,
            name: prospect.full_name || prospect.name,
            email: prospect.email,
            company: prospect.company_name || prospect.company
          }
        }
      })
      .select()
      .single();

    if (execError) {
      return { success: false, logs, error: execError.message };
    }

    log('info', `Execution created: ${execution.id}`);

    // Start the execution
    const result = await startFlowExecution(flowId, prospectId, workspaceId, userId);

    if (!result.success) {
      log('error', 'Execution failed to start', result.error);
      return { success: false, execution, logs, error: result.error };
    }

    log('success', 'Test mode execution started successfully');

    // Return immediately - execution runs async
    return {
      success: true,
      execution: { ...execution, ...result },
      logs
    };
  } catch (error) {
    log('error', 'Exception during test execution', error.message);
    return { success: false, logs, error: error.message };
  }
}

// ============================================================================
// Flow Validation
// ============================================================================

/**
 * Validate flow configuration
 * @param {Object} flowDefinition - Flow definition with nodes and edges
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array}>}
 */
export async function validateFlowConfig(flowDefinition) {
  const errors = [];
  const warnings = [];

  try {
    const { nodes = [], edges = [] } = flowDefinition;

    // Basic structure validation
    if (!Array.isArray(nodes)) {
      errors.push('nodes must be an array');
      return { valid: false, errors, warnings };
    }

    if (!Array.isArray(edges)) {
      errors.push('edges must be an array');
      return { valid: false, errors, warnings };
    }

    // Use built-in validation
    const basicValidation = validateFlowDefinition(nodes, edges);
    errors.push(...(basicValidation.errors || []));
    warnings.push(...(basicValidation.warnings || []));

    // Additional node config validation
    for (const node of nodes) {
      const nodeErrors = validateNodeConfig(node);
      if (nodeErrors.length > 0) {
        errors.push(`Node "${node.data?.label || node.id}": ${nodeErrors.join(', ')}`);
      }
    }

    // Validate edge connections
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    // Check for unreachable nodes
    const reachable = new Set();
    const triggerNodes = nodes.filter(n => ['trigger', 'start'].includes(n.type));

    if (triggerNodes.length === 0) {
      errors.push('Flow must have at least one trigger node');
    } else {
      // BFS from trigger to find reachable nodes
      const queue = triggerNodes.map(n => n.id);
      while (queue.length > 0) {
        const current = queue.shift();
        if (reachable.has(current)) continue;
        reachable.add(current);

        edges.filter(e => e.source === current).forEach(e => {
          if (!reachable.has(e.target)) {
            queue.push(e.target);
          }
        });
      }

      const unreachable = nodes.filter(n => !reachable.has(n.id) && !['trigger', 'start'].includes(n.type));
      if (unreachable.length > 0) {
        warnings.push(`${unreachable.length} node(s) are not reachable from trigger`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    errors.push(`Validation error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Validate individual node configuration
 * @param {Object} node - Node definition
 * @returns {Array} Array of error messages
 */
function validateNodeConfig(node) {
  const errors = [];
  const data = node.data || {};

  switch (node.type) {
    case 'sendEmail':
    case 'send_email':
      if (!data.emailType && !data.subject && !data.useAI) {
        errors.push('Email node needs subject or AI generation enabled');
      }
      break;

    case 'timer':
    case 'delay':
      const totalMinutes = (data.days || 0) * 1440 + (data.hours || 0) * 60 + (data.minutes || 0);
      if (totalMinutes <= 0) {
        errors.push('Timer must have duration > 0');
      }
      break;

    case 'condition':
    case 'branch':
      if (!data.conditions || data.conditions.length === 0) {
        errors.push('Condition node needs at least one condition');
      }
      break;

    case 'aiAnalysis':
    case 'ai_analysis':
    case 'research':
      if (!data.prompt && !data.analysisType) {
        errors.push('AI node needs prompt or analysis type');
      }
      break;

    case 'linkedinMessage':
    case 'linkedin':
      if (!data.messageType) {
        errors.push('LinkedIn node needs message type');
      }
      break;

    case 'sms':
      if (!data.message && !data.useAI) {
        errors.push('SMS node needs message or AI generation');
      }
      break;
  }

  return errors;
}

// ============================================================================
// Node Simulation
// ============================================================================

/**
 * Simulate node execution without actually running it
 * @param {string} nodeType - Type of node
 * @param {Object} nodeConfig - Node configuration
 * @param {Object} mockProspect - Mock prospect data
 * @returns {Promise<{success: boolean, output?: Object, error?: string}>}
 */
export async function simulateNode(nodeType, nodeConfig, mockProspect = null) {
  const prospect = mockProspect || generateMockProspect();
  const company = generateMockCompany();

  try {
    switch (nodeType) {
      case 'trigger':
      case 'start':
        return {
          success: true,
          output: {
            action: 'triggered',
            prospect,
            timestamp: new Date().toISOString()
          }
        };

      case 'aiAnalysis':
      case 'ai_analysis':
      case 'research':
        // Simulate AI analysis output
        return {
          success: true,
          output: {
            analysis: `Analysis for ${prospect.name}:\n\n- Title: ${prospect.title} at ${prospect.company}\n- Likely interests: Technology, Innovation, Growth\n- Communication style: Professional, Data-driven\n- Best outreach approach: Highlight ROI and efficiency gains`,
            confidence: 0.85,
            key_points: [
              'Decision maker in technology',
              'Company in growth phase',
              'Likely receptive to efficiency solutions'
            ],
            tokens_used: {
              input: 250,
              output: 180
            },
            simulated: true
          }
        };

      case 'sendEmail':
      case 'send_email':
        // Simulate email generation
        const emailType = nodeConfig.emailType || 'initial_outreach';
        return {
          success: true,
          output: {
            subject: `Quick question about ${prospect.company}'s ${nodeConfig.subject || 'growth strategy'}`,
            body: `Hi ${prospect.name.split(' ')[0]},\n\nI noticed ${prospect.company} is doing impressive work in the ${company.industry} space...\n\n[AI-generated personalized content would appear here]\n\nWould you be open to a brief conversation?\n\nBest,\n[Your name]`,
            recipient: prospect.email,
            status: 'draft', // Test mode creates drafts
            simulated: true
          }
        };

      case 'timer':
      case 'delay':
        const minutes = (nodeConfig.days || 0) * 1440 + (nodeConfig.hours || 0) * 60 + (nodeConfig.minutes || 5);
        return {
          success: true,
          output: {
            action: 'scheduled',
            delay_minutes: minutes,
            scheduled_for: new Date(Date.now() + minutes * 60000).toISOString(),
            simulated: true
          }
        };

      case 'condition':
      case 'branch':
        // Simulate condition evaluation
        const conditions = nodeConfig.conditions || [];
        return {
          success: true,
          output: {
            evaluated_conditions: conditions.map(c => ({
              condition: c,
              result: Math.random() > 0.5
            })),
            branch_taken: Math.random() > 0.5 ? 'true' : 'false',
            simulated: true
          }
        };

      case 'linkedinMessage':
      case 'linkedin':
        return {
          success: true,
          output: {
            message: `Hi ${prospect.name.split(' ')[0]}, I came across your profile and was impressed by your work at ${prospect.company}...`,
            type: nodeConfig.messageType || 'connection_request',
            status: 'draft',
            simulated: true
          }
        };

      case 'sms':
        return {
          success: true,
          output: {
            message: nodeConfig.message || `Hi ${prospect.name.split(' ')[0]}, following up on my email about ${prospect.company}. Would love to connect!`,
            to: prospect.phone,
            status: 'draft',
            simulated: true
          }
        };

      case 'updateStatus':
      case 'update_status':
        return {
          success: true,
          output: {
            previous_stage: prospect.stage,
            new_stage: nodeConfig.newStatus || 'contacted',
            notes_added: nodeConfig.notes || '',
            simulated: true
          }
        };

      case 'end':
        return {
          success: true,
          output: {
            action: 'flow_ended',
            reason: nodeConfig.reason || 'completed',
            simulated: true
          }
        };

      default:
        return {
          success: true,
          output: {
            action: 'executed',
            node_type: nodeType,
            config: nodeConfig,
            simulated: true
          }
        };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  generateMockProspect,
  generateMockCompany,
  createTestProspect,
  cleanupTestProspects,
  runFlowInTestMode,
  validateFlowConfig,
  simulateNode
};
