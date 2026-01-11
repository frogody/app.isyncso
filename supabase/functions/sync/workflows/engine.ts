/**
 * SYNC Workflow Engine
 * Implements sophisticated multi-agent workflows with parallel, sequential,
 * conditional, and iterative patterns using Together.ai.
 */

import {
  WorkflowType,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  AgentResponse,
  ParallelResult,
  SequentialResult,
  IterativeResult,
  RoutingDecision,
  EvaluationResult,
  IntentClassification,
} from './types.ts';
import { SPECIALIZED_AGENTS, getAgent, getAgentDescriptions } from './agents.ts';

const TOGETHER_API_KEY = Deno.env.get('TOGETHER_API_KEY');
const TOGETHER_BASE_URL = 'https://api.together.xyz/v1';

// ============================================================================
// LLM CALL UTILITIES
// ============================================================================

interface LLMCallOptions {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

async function callLLM(options: LLMCallOptions): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const response = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.jsonMode && { response_format: { type: 'json_object' } }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM call failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAgent(
  agentId: string,
  userPrompt: string,
  context?: WorkflowContext
): Promise<AgentResponse> {
  const agent = getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const startTime = Date.now();

  // Build context-aware system prompt
  let systemPrompt = agent.systemPrompt;
  if (context?.memories?.length) {
    systemPrompt += `\n\nRelevant memories from past conversations:\n${context.memories.join('\n')}`;
  }
  if (context?.entities && Object.keys(context.entities).length > 0) {
    systemPrompt += `\n\nKnown entities:\n${JSON.stringify(context.entities, null, 2)}`;
  }

  const content = await callLLM({
    model: agent.model,
    systemPrompt,
    userPrompt,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
  });

  return {
    agentId: agent.id,
    agentName: agent.name,
    content,
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// INTENT CLASSIFICATION
// ============================================================================

export async function classifyIntent(
  userMessage: string,
  context?: WorkflowContext
): Promise<IntentClassification> {
  const systemPrompt = `You are an intent classifier. Analyze the user's message and determine:
1. The primary intent/goal
2. Secondary intents if any
3. Complexity level (simple, moderate, complex)
4. Which workflow pattern would be best:
   - sequential: for step-by-step tasks
   - parallel: for gathering multiple perspectives or data
   - conditional: for routing to specific experts
   - iterative: for tasks requiring refinement
   - hybrid: for complex multi-step tasks
5. Which agents should handle this

Available agents:
${getAgentDescriptions()}

Respond in JSON format:
{
  "primaryIntent": "string",
  "confidence": 0.0-1.0,
  "secondaryIntents": ["string"],
  "complexity": "simple|moderate|complex",
  "suggestedWorkflow": "sequential|parallel|conditional|iterative|hybrid",
  "suggestedAgents": ["agentId1", "agentId2"],
  "reasoning": "brief explanation"
}`;

  const response = await callLLM({
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    systemPrompt,
    userPrompt: `User message: "${userMessage}"${context?.conversationHistory?.length ? `\n\nRecent conversation:\n${context.conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}`,
    temperature: 0.2,
    maxTokens: 1000,
    jsonMode: true,
  });

  try {
    return JSON.parse(response);
  } catch {
    // Fallback classification
    return {
      primaryIntent: 'general_query',
      confidence: 0.5,
      secondaryIntents: [],
      complexity: 'moderate',
      suggestedWorkflow: 'conditional',
      suggestedAgents: ['orchestrator'],
    };
  }
}

// ============================================================================
// PARALLEL WORKFLOW
// ============================================================================

export async function executeParallelWorkflow(
  userMessage: string,
  agentIds: string[],
  context?: WorkflowContext
): Promise<ParallelResult> {
  const startTime = Date.now();

  // Execute all agents in parallel
  const agentPromises = agentIds.map(agentId =>
    callAgent(agentId, userMessage, context).catch(err => ({
      agentId,
      agentName: getAgent(agentId)?.name || agentId,
      content: `Error: ${err.message}`,
      executionTimeMs: 0,
    }))
  );

  const responses = await Promise.all(agentPromises);

  // Aggregate responses using the aggregator agent
  const aggregatorPrompt = `Multiple expert agents have analyzed this request. Synthesize their insights into a single, comprehensive response.

User's original request: "${userMessage}"

Expert responses:
${responses.map(r => `### ${r.agentName}\n${r.content}`).join('\n\n')}

Provide a unified, coherent response that combines the best insights from all experts.
Do not mention the individual agents or that multiple sources were consulted.`;

  const aggregatedResponse = await callLLM({
    model: 'deepseek-ai/DeepSeek-V3',
    systemPrompt: SPECIALIZED_AGENTS.aggregator.systemPrompt,
    userPrompt: aggregatorPrompt,
    temperature: 0.3,
    maxTokens: 3000,
  });

  return {
    responses,
    aggregatedResponse,
    totalExecutionTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SEQUENTIAL WORKFLOW
// ============================================================================

export async function executeSequentialWorkflow(
  userMessage: string,
  agentIds: string[],
  context?: WorkflowContext
): Promise<SequentialResult> {
  const startTime = Date.now();
  const steps: AgentResponse[] = [];
  let currentInput = userMessage;

  for (const agentId of agentIds) {
    const prompt = steps.length > 0
      ? `Previous step output:\n${steps[steps.length - 1].content}\n\nOriginal request: ${userMessage}\n\nContinue processing based on the above.`
      : currentInput;

    const response = await callAgent(agentId, prompt, context);
    steps.push(response);
    currentInput = response.content;
  }

  return {
    steps,
    finalResponse: steps[steps.length - 1]?.content || '',
    totalExecutionTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// CONDITIONAL WORKFLOW (ROUTING)
// ============================================================================

export async function executeConditionalWorkflow(
  userMessage: string,
  context?: WorkflowContext
): Promise<{ routingDecision: RoutingDecision; response: AgentResponse }> {
  // First, classify and route
  const routerPrompt = `Analyze this user request and select the BEST single agent to handle it.

User request: "${userMessage}"

Available agents:
${getAgentDescriptions()}

Respond in JSON:
{
  "selectedAgent": "agentId",
  "reasoning": "why this agent is best",
  "confidence": 0.0-1.0,
  "alternativeAgents": ["other", "options"]
}`;

  const routingResponse = await callLLM({
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    systemPrompt: 'You are a request router. Select the most appropriate agent for each request.',
    userPrompt: routerPrompt,
    temperature: 0.2,
    maxTokens: 500,
    jsonMode: true,
  });

  let routingDecision: RoutingDecision;
  try {
    routingDecision = JSON.parse(routingResponse);
  } catch {
    routingDecision = {
      selectedAgent: 'orchestrator',
      reasoning: 'Fallback to orchestrator',
      confidence: 0.5,
    };
  }

  // Execute the selected agent
  const response = await callAgent(routingDecision.selectedAgent, userMessage, context);

  return { routingDecision, response };
}

// ============================================================================
// ITERATIVE WORKFLOW
// ============================================================================

export async function executeIterativeWorkflow(
  userMessage: string,
  agentId: string,
  maxIterations: number = 3,
  qualityThreshold: number = 8,
  context?: WorkflowContext
): Promise<IterativeResult> {
  const startTime = Date.now();
  const evaluations: EvaluationResult[] = [];
  let currentResponse = '';
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Generate response (or improve previous)
    const generatorPrompt = iteration === 1
      ? userMessage
      : `Original request: ${userMessage}\n\nPrevious response:\n${currentResponse}\n\nFeedback for improvement:\n${evaluations[evaluations.length - 1]?.feedback}\n\nPlease improve the response based on this feedback.`;

    const generatorResponse = await callAgent(agentId, generatorPrompt, context);
    currentResponse = generatorResponse.content;

    // Evaluate the response
    const evaluatorPrompt = `Evaluate this response quality.

Original request: "${userMessage}"

Response to evaluate:
${currentResponse}

Rate on a scale of 1-10 and provide specific feedback.
Respond in JSON:
{
  "status": "PASS|NEEDS_IMPROVEMENT|FAIL",
  "score": 1-10,
  "feedback": "specific improvement suggestions"
}`;

    const evalResponse = await callLLM({
      model: SPECIALIZED_AGENTS.evaluator.model,
      systemPrompt: SPECIALIZED_AGENTS.evaluator.systemPrompt,
      userPrompt: evaluatorPrompt,
      temperature: 0.1,
      maxTokens: 500,
      jsonMode: true,
    });

    let evaluation: EvaluationResult;
    try {
      const parsed = JSON.parse(evalResponse);
      evaluation = {
        iteration,
        status: parsed.status,
        feedback: parsed.feedback,
        score: parsed.score,
      };
    } catch {
      evaluation = {
        iteration,
        status: 'PASS',
        feedback: 'Evaluation parsing failed, accepting response',
        score: 7,
      };
    }

    evaluations.push(evaluation);

    // Check if we should stop
    if (evaluation.status === 'PASS' || evaluation.score >= qualityThreshold) {
      break;
    }
  }

  return {
    iterations: iteration,
    finalResponse: currentResponse,
    evaluations,
    totalExecutionTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// HYBRID WORKFLOW (Complex multi-step)
// ============================================================================

export async function executeHybridWorkflow(
  userMessage: string,
  classification: IntentClassification,
  context?: WorkflowContext
): Promise<WorkflowResult> {
  const startTime = Date.now();
  const agentsUsed: string[] = [];

  // Step 1: Parallel research/data gathering if complex
  let parallelInsights = '';
  if (classification.complexity === 'complex' && classification.suggestedAgents.length > 1) {
    const parallelResult = await executeParallelWorkflow(
      userMessage,
      classification.suggestedAgents.slice(0, 3), // Max 3 parallel agents
      context
    );
    parallelInsights = parallelResult.aggregatedResponse;
    agentsUsed.push(...classification.suggestedAgents.slice(0, 3));
  }

  // Step 2: Primary agent processing
  const primaryAgent = classification.suggestedAgents[0] || 'orchestrator';
  const primaryPrompt = parallelInsights
    ? `User request: ${userMessage}\n\nAdditional context from research:\n${parallelInsights}\n\nProvide a comprehensive response.`
    : userMessage;

  const primaryResponse = await callAgent(primaryAgent, primaryPrompt, context);
  agentsUsed.push(primaryAgent);

  // Step 3: Iterative refinement for complex tasks
  let finalResponse = primaryResponse.content;
  let evaluations: EvaluationResult[] = [];

  if (classification.complexity === 'complex') {
    const iterativeResult = await executeIterativeWorkflow(
      userMessage,
      primaryAgent,
      2, // Max 2 refinement iterations
      8,
      context
    );
    finalResponse = iterativeResult.finalResponse;
    evaluations = iterativeResult.evaluations;
  }

  return {
    type: 'hybrid',
    response: finalResponse,
    agentsUsed: [...new Set(agentsUsed)],
    executionTimeMs: Date.now() - startTime,
    metadata: {
      iterations: evaluations.length,
      parallelResponses: parallelInsights ? classification.suggestedAgents.length : 0,
      evaluations,
    },
  };
}

// ============================================================================
// MAIN WORKFLOW EXECUTOR
// ============================================================================

export async function executeWorkflow(
  userMessage: string,
  context?: WorkflowContext,
  forceWorkflowType?: WorkflowType
): Promise<WorkflowResult> {
  const startTime = Date.now();

  // Classify intent to determine best workflow
  const classification = await classifyIntent(userMessage, context);
  const workflowType = forceWorkflowType || classification.suggestedWorkflow;

  console.log(`[Workflow] Intent: ${classification.primaryIntent}, Workflow: ${workflowType}, Agents: ${classification.suggestedAgents.join(', ')}`);

  let result: WorkflowResult;

  switch (workflowType) {
    case 'parallel': {
      const parallelResult = await executeParallelWorkflow(
        userMessage,
        classification.suggestedAgents,
        context
      );
      result = {
        type: 'parallel',
        response: parallelResult.aggregatedResponse,
        agentsUsed: classification.suggestedAgents,
        executionTimeMs: parallelResult.totalExecutionTimeMs,
        metadata: {
          parallelResponses: parallelResult.responses.length,
        },
      };
      break;
    }

    case 'sequential': {
      const sequentialResult = await executeSequentialWorkflow(
        userMessage,
        classification.suggestedAgents,
        context
      );
      result = {
        type: 'sequential',
        response: sequentialResult.finalResponse,
        agentsUsed: classification.suggestedAgents,
        executionTimeMs: sequentialResult.totalExecutionTimeMs,
        metadata: {},
      };
      break;
    }

    case 'iterative': {
      const iterativeResult = await executeIterativeWorkflow(
        userMessage,
        classification.suggestedAgents[0] || 'orchestrator',
        3,
        8,
        context
      );
      result = {
        type: 'iterative',
        response: iterativeResult.finalResponse,
        agentsUsed: [classification.suggestedAgents[0] || 'orchestrator'],
        executionTimeMs: iterativeResult.totalExecutionTimeMs,
        metadata: {
          iterations: iterativeResult.iterations,
          evaluations: iterativeResult.evaluations,
        },
      };
      break;
    }

    case 'hybrid': {
      result = await executeHybridWorkflow(userMessage, classification, context);
      break;
    }

    case 'conditional':
    default: {
      const { routingDecision, response } = await executeConditionalWorkflow(
        userMessage,
        context
      );
      result = {
        type: 'conditional',
        response: response.content,
        agentsUsed: [routingDecision.selectedAgent],
        executionTimeMs: Date.now() - startTime,
        metadata: {
          routingDecision,
        },
      };
      break;
    }
  }

  console.log(`[Workflow] Completed in ${result.executionTimeMs}ms, agents: ${result.agentsUsed.join(', ')}`);
  return result;
}

// Export for use in main sync function
export { SPECIALIZED_AGENTS };
