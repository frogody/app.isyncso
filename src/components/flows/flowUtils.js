/**
 * Flow Utilities
 * Helper functions for flow operations
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique node ID
 * @param {string} type - Node type prefix
 * @returns {string} Unique node ID
 */
export function generateNodeId(type = 'node') {
  return `${type}_${uuidv4().slice(0, 8)}`;
}

/**
 * Generate a unique edge ID
 * @param {string} source - Source node ID
 * @param {string} target - Target node ID
 * @param {string} sourceHandle - Source handle ID
 * @returns {string} Unique edge ID
 */
export function generateEdgeId(source, target, sourceHandle = 'default') {
  return `edge_${source}_${sourceHandle}_${target}`;
}

// ============================================================================
// Database Conversion
// ============================================================================

/**
 * Convert React Flow format to database format
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {Object} Database format { nodes, edges }
 */
export function flowToDatabase(nodes, edges) {
  // Convert nodes
  const dbNodes = nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y)
    },
    data: {
      ...node.data,
      // Clean up React Flow specific fields
      selected: undefined,
      dragging: undefined
    }
  }));

  // Convert edges
  const dbEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null,
    type: edge.type || 'custom',
    data: edge.data || {}
  }));

  return { nodes: dbNodes, edges: dbEdges };
}

/**
 * Convert database format to React Flow format
 * @param {Array} dbNodes - Database nodes
 * @param {Array} dbEdges - Database edges
 * @returns {Object} React Flow format { nodes, edges }
 */
export function databaseToFlow(dbNodes = [], dbEdges = []) {
  // Convert nodes
  const nodes = dbNodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: node.data || {}
  }));

  // Convert edges
  const edges = dbEdges.map(edge => ({
    id: edge.id || generateEdgeId(edge.source, edge.target, edge.sourceHandle),
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    type: edge.type || 'custom',
    data: edge.data || {}
  }));

  return { nodes, edges };
}

// ============================================================================
// Auto Layout
// ============================================================================

/**
 * Auto-layout nodes in a tree structure
 * @param {Array} nodes - Nodes to layout
 * @param {Array} edges - Edges connecting nodes
 * @param {Object} options - Layout options
 * @returns {Array} Nodes with updated positions
 */
export function autoLayout(nodes, edges, options = {}) {
  const {
    direction = 'TB', // TB (top-bottom), LR (left-right)
    nodeWidth = 200,
    nodeHeight = 100,
    horizontalSpacing = 50,
    verticalSpacing = 80
  } = options;

  if (nodes.length === 0) return nodes;

  // Build adjacency map
  const children = new Map();
  const parents = new Map();

  edges.forEach(edge => {
    if (!children.has(edge.source)) {
      children.set(edge.source, []);
    }
    children.get(edge.source).push(edge.target);

    if (!parents.has(edge.target)) {
      parents.set(edge.target, []);
    }
    parents.get(edge.target).push(edge.source);
  });

  // Find root nodes (no parents)
  const roots = nodes.filter(node => !parents.has(node.id) || parents.get(node.id).length === 0);

  // BFS to assign levels
  const levels = new Map();
  const queue = [...roots.map(r => ({ id: r.id, level: 0 }))];
  const visited = new Set();

  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levels.set(id, level);

    const nodeChildren = children.get(id) || [];
    nodeChildren.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Group nodes by level
  const levelGroups = new Map();
  nodes.forEach(node => {
    const level = levels.get(node.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level).push(node);
  });

  // Position nodes
  const isHorizontal = direction === 'LR';
  const positioned = nodes.map(node => {
    const level = levels.get(node.id) ?? 0;
    const levelNodes = levelGroups.get(level) || [node];
    const indexInLevel = levelNodes.findIndex(n => n.id === node.id);
    const levelWidth = levelNodes.length * nodeWidth + (levelNodes.length - 1) * horizontalSpacing;
    const startX = -levelWidth / 2;

    let x, y;
    if (isHorizontal) {
      x = level * (nodeWidth + verticalSpacing);
      y = startX + indexInLevel * (nodeWidth + horizontalSpacing);
    } else {
      x = startX + indexInLevel * (nodeWidth + horizontalSpacing);
      y = level * (nodeHeight + verticalSpacing);
    }

    return {
      ...node,
      position: { x, y }
    };
  });

  return positioned;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate flow structure
 * @param {Array} nodes - Flow nodes
 * @param {Array} edges - Flow edges
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export function validateFlow(nodes, edges) {
  const errors = [];
  const warnings = [];

  // Check for empty flow
  if (nodes.length === 0) {
    errors.push('Flow must have at least one node');
    return { valid: false, errors, warnings };
  }

  // Check for trigger node
  const triggerNodes = nodes.filter(n => n.type === 'trigger' || n.type === 'start');
  if (triggerNodes.length === 0) {
    errors.push('Flow must have a trigger/start node');
  } else if (triggerNodes.length > 1) {
    warnings.push('Flow has multiple trigger nodes - only the first will be used');
  }

  // Check for orphan nodes (no incoming or outgoing edges)
  const connectedNodeIds = new Set([
    ...edges.map(e => e.source),
    ...edges.map(e => e.target)
  ]);

  const orphanNodes = nodes.filter(n =>
    n.type !== 'trigger' &&
    n.type !== 'start' &&
    !connectedNodeIds.has(n.id)
  );

  if (orphanNodes.length > 0) {
    warnings.push(`${orphanNodes.length} node(s) are not connected to the flow`);
  }

  // Check for cycles (simple detection)
  const visited = new Set();
  const recursionStack = new Set();
  const adjacency = new Map();

  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source).push(edge.target);
  });

  function hasCycle(nodeId) {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const children = adjacency.get(nodeId) || [];
    for (const child of children) {
      if (hasCycle(child)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (hasCycle(node.id)) {
      errors.push('Flow contains a cycle - flows must be acyclic');
      break;
    }
  }

  // Check for end nodes
  const endNodes = nodes.filter(n => n.type === 'end');
  const nodesWithoutOutgoing = nodes.filter(n => {
    const outgoing = edges.filter(e => e.source === n.id);
    return outgoing.length === 0 && n.type !== 'end';
  });

  if (endNodes.length === 0 && nodesWithoutOutgoing.length > 0) {
    warnings.push('Flow has nodes without successors but no explicit end node');
  }

  // Check condition nodes have both branches
  const conditionNodes = nodes.filter(n => n.type === 'condition' || n.type === 'branch');
  conditionNodes.forEach(node => {
    const outgoing = edges.filter(e => e.source === node.id);
    const handles = new Set(outgoing.map(e => e.sourceHandle));

    if (!handles.has('true') && !handles.has('false')) {
      warnings.push(`Condition node "${node.data?.name || node.id}" has no branch connections`);
    } else if (!handles.has('true')) {
      warnings.push(`Condition node "${node.data?.name || node.id}" is missing "true" branch`);
    } else if (!handles.has('false')) {
      warnings.push(`Condition node "${node.data?.name || node.id}" is missing "false" branch`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Node Helpers
// ============================================================================

/**
 * Find the trigger node in a flow
 * @param {Array} nodes - Flow nodes
 * @returns {Object|null} Trigger node or null
 */
export function findTriggerNode(nodes) {
  return nodes.find(n => n.type === 'trigger' || n.type === 'start') || null;
}

/**
 * Find all nodes downstream from a given node
 * @param {string} nodeId - Starting node ID
 * @param {Array} edges - Flow edges
 * @returns {Set<string>} Set of downstream node IDs
 */
export function findDownstreamNodes(nodeId, edges) {
  const downstream = new Set();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    const children = edges
      .filter(e => e.source === current)
      .map(e => e.target);

    children.forEach(child => {
      if (!downstream.has(child)) {
        downstream.add(child);
        queue.push(child);
      }
    });
  }

  return downstream;
}

/**
 * Get execution path from trigger to end
 * @param {Array} nodes - Flow nodes
 * @param {Array} edges - Flow edges
 * @returns {Array<Array<string>>} All possible paths (arrays of node IDs)
 */
export function getExecutionPaths(nodes, edges) {
  const trigger = findTriggerNode(nodes);
  if (!trigger) return [];

  const paths = [];
  const adjacency = new Map();

  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source).push(edge.target);
  });

  function dfs(nodeId, path) {
    const newPath = [...path, nodeId];
    const children = adjacency.get(nodeId) || [];

    if (children.length === 0) {
      paths.push(newPath);
    } else {
      children.forEach(child => dfs(child, newPath));
    }
  }

  dfs(trigger.id, []);
  return paths;
}

// ============================================================================
// Default Flow Templates
// ============================================================================

/**
 * Create a default empty flow structure
 * @returns {Object} { nodes, edges }
 */
export function createEmptyFlow() {
  const triggerId = generateNodeId('trigger');

  return {
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          name: 'Start',
          trigger_type: 'manual'
        }
      }
    ],
    edges: []
  };
}

/**
 * Create a simple outreach flow template
 * @returns {Object} { nodes, edges }
 */
export function createOutreachTemplate() {
  const triggerId = generateNodeId('trigger');
  const researchId = generateNodeId('research');
  const emailId = generateNodeId('sendEmail');
  const timerId = generateNodeId('timer');
  const followUpId = generateNodeId('followUp');
  const endId = generateNodeId('end');

  return {
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { name: 'Start', trigger_type: 'new_prospect' }
      },
      {
        id: researchId,
        type: 'research',
        position: { x: 250, y: 120 },
        data: { name: 'Research Prospect' }
      },
      {
        id: emailId,
        type: 'sendEmail',
        position: { x: 250, y: 240 },
        data: { name: 'Initial Outreach', email_type: 'cold_outreach' }
      },
      {
        id: timerId,
        type: 'timer',
        position: { x: 250, y: 360 },
        data: { name: 'Wait 3 days', delay_days: 3 }
      },
      {
        id: followUpId,
        type: 'followUp',
        position: { x: 250, y: 480 },
        data: { name: 'Follow Up', channel: 'email' }
      },
      {
        id: endId,
        type: 'end',
        position: { x: 250, y: 600 },
        data: { name: 'Complete' }
      }
    ],
    edges: [
      { id: generateEdgeId(triggerId, researchId), source: triggerId, target: researchId, type: 'custom' },
      { id: generateEdgeId(researchId, emailId), source: researchId, target: emailId, type: 'custom' },
      { id: generateEdgeId(emailId, timerId), source: emailId, target: timerId, type: 'custom' },
      { id: generateEdgeId(timerId, followUpId), source: timerId, target: followUpId, type: 'custom' },
      { id: generateEdgeId(followUpId, endId), source: followUpId, target: endId, type: 'custom' }
    ]
  };
}
