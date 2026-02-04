/**
 * Simple metrics collection for RAG Outreach System
 * Logs structured metrics that can be extended to send to
 * CloudWatch, DataDog, or other observability platforms.
 */

const metrics = {
  counters: {},
  timings: [],
  errors: []
};

export function incrementCounter(name, tags = {}) {
  const key = `${name}:${JSON.stringify(tags)}`;
  metrics.counters[key] = (metrics.counters[key] || 0) + 1;
  console.log(`[METRIC] ${name}`, { count: metrics.counters[key], ...tags });
}

export function recordTiming(name, durationMs, tags = {}) {
  metrics.timings.push({
    name,
    duration: durationMs,
    tags,
    timestamp: new Date().toISOString()
  });

  // Keep only last 1000 timings in memory
  if (metrics.timings.length > 1000) {
    metrics.timings = metrics.timings.slice(-1000);
  }

  console.log(`[METRIC] ${name}`, { duration: durationMs, ...tags });
}

export function recordError(name, error, tags = {}) {
  metrics.errors.push({
    name,
    error: error.message || error,
    tags,
    timestamp: new Date().toISOString()
  });

  // Keep only last 100 errors
  if (metrics.errors.length > 100) {
    metrics.errors = metrics.errors.slice(-100);
  }

  console.error(`[METRIC:ERROR] ${name}`, { error: error.message || error, ...tags });
}

export function getMetricsSummary() {
  return {
    counters: metrics.counters,
    recentTimings: metrics.timings.slice(-50),
    recentErrors: metrics.errors.slice(-20)
  };
}

// Flow execution metrics
export const flowMetrics = {
  executionStarted: (flowId, prospectId, workspaceId) => {
    incrementCounter('flow.execution.started', { flowId, workspaceId });
  },

  executionCompleted: (flowId, durationMs, success) => {
    incrementCounter('flow.execution.completed', { flowId, success });
    recordTiming('flow.execution.duration', durationMs, { flowId, success });
  },

  nodeExecuted: (nodeType, durationMs, success) => {
    incrementCounter('node.execution', { nodeType, success });
    recordTiming('node.execution.duration', durationMs, { nodeType });
  },

  toolExecuted: (toolName, durationMs, success) => {
    incrementCounter('tool.execution', { toolName, success });
    recordTiming('tool.execution.duration', durationMs, { toolName });
  },

  claudeApiCall: (tokens, durationMs, model) => {
    incrementCounter('claude.api.call', { model });
    recordTiming('claude.api.duration', durationMs, { model, tokens });
  },

  embeddingCreated: (collection, chunkCount) => {
    incrementCounter('embedding.created', { collection, chunkCount });
  },

  searchPerformed: (searchType, resultCount) => {
    incrementCounter('search.performed', { searchType, resultCount });
  }
};

export default flowMetrics;
