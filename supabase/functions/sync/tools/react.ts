/**
 * ReAct (Reason + Act) Loop Implementation
 *
 * Pattern: Thought → Action → Observation → Repeat
 * Enables complex multi-step orchestration with dynamic planning
 *
 * Based on: https://arxiv.org/abs/2210.03629
 */

import { ActionContext, ActionResult } from './types.ts';

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// Maximum reasoning iterations to prevent infinite loops
const MAX_ITERATIONS = 7;

// ============================================================================
// Types
// ============================================================================

export interface ReActStep {
  iteration: number;
  thought: string;
  action?: {
    name: string;
    data: Record<string, unknown>;
  };
  observation?: string;
  isComplete: boolean;
}

export interface ReActResult {
  success: boolean;
  steps: ReActStep[];
  finalAnswer: string;
  totalIterations: number;
  actionsExecuted: string[];
  intermediateResults: Record<string, unknown>;
}

export interface ReActContext {
  userQuery: string;
  systemPrompt: string;
  availableActions: string[];
  ctx: ActionContext;
  executeAction: (action: { action: string; data: any }, companyId: string, userId?: string) => Promise<ActionResult>;
  onStep?: (step: ReActStep) => void; // Callback for streaming thoughts to user
}

// ============================================================================
// ReAct System Prompt
// ============================================================================

const REACT_SYSTEM_PROMPT = `You are a reasoning agent that solves complex tasks step by step.

## Your Process
For each step, you MUST output in this EXACT format:

THOUGHT: [Your reasoning about what to do next based on the current situation]
ACTION: [action_name]
ACTION_INPUT: [JSON object with action parameters]

OR if you have enough information to answer:

THOUGHT: [Your reasoning about why you can now answer]
FINAL_ANSWER: [Your complete answer to the user's original question]

## Rules
1. ALWAYS start with THOUGHT - explain your reasoning
2. Only call ONE action per iteration
3. Wait for OBSERVATION before next thought
4. Use FINAL_ANSWER only when you have ALL information needed
5. If an action fails, think about alternatives
6. Keep intermediate results in mind for synthesis
7. Maximum ${MAX_ITERATIONS} iterations - plan efficiently

## Available Actions
{{AVAILABLE_ACTIONS}}

## Current Task
{{USER_QUERY}}

## Conversation So Far
{{HISTORY}}

Now, what's your next step?`;

// ============================================================================
// ReAct Loop Executor
// ============================================================================

export async function executeReActLoop(context: ReActContext): Promise<ReActResult> {
  const steps: ReActStep[] = [];
  const actionsExecuted: string[] = [];
  const intermediateResults: Record<string, unknown> = {};

  let history = '';
  let finalAnswer = '';

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // Build prompt with current history
    const prompt = REACT_SYSTEM_PROMPT
      .replace('{{AVAILABLE_ACTIONS}}', context.availableActions.join(', '))
      .replace('{{USER_QUERY}}', context.userQuery)
      .replace('{{HISTORY}}', history || 'No actions taken yet.');

    // Call LLM for next step
    const response = await callLLM(prompt, context.systemPrompt);

    // Parse the response
    const step = parseReActResponse(response, iteration);
    steps.push(step);

    // Notify listener (for streaming to user)
    if (context.onStep) {
      context.onStep(step);
    }

    // Check if we have a final answer
    if (step.isComplete) {
      finalAnswer = step.thought;
      break;
    }

    // Execute the action if present
    if (step.action) {
      const actionResult = await context.executeAction(
        { action: step.action.name, data: step.action.data },
        context.ctx.companyId,
        context.ctx.userId
      );

      actionsExecuted.push(step.action.name);
      intermediateResults[`step_${iteration}_${step.action.name}`] = actionResult.result;

      // Add observation to step
      step.observation = actionResult.success
        ? actionResult.message
        : `ERROR: ${actionResult.error || actionResult.message}`;

      // Update history for next iteration
      history += `
---
THOUGHT: ${step.thought}
ACTION: ${step.action.name}
ACTION_INPUT: ${JSON.stringify(step.action.data)}
OBSERVATION: ${step.observation}
`;
    }
  }

  // If we hit max iterations without final answer, synthesize what we have
  if (!finalAnswer && steps.length > 0) {
    finalAnswer = await synthesizeFinalAnswer(context.userQuery, steps, intermediateResults);
  }

  return {
    success: true,
    steps,
    finalAnswer,
    totalIterations: steps.length,
    actionsExecuted,
    intermediateResults,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshotai/Kimi-K2-Instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more focused reasoning
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseReActResponse(response: string, iteration: number): ReActStep {
  const step: ReActStep = {
    iteration,
    thought: '',
    isComplete: false,
  };

  // Extract THOUGHT
  const thoughtMatch = response.match(/THOUGHT:\s*([\s\S]*?)(?=ACTION:|FINAL_ANSWER:|$)/i);
  if (thoughtMatch) {
    step.thought = thoughtMatch[1].trim();
  }

  // Check for FINAL_ANSWER
  const finalMatch = response.match(/FINAL_ANSWER:\s*([\s\S]*?)$/i);
  if (finalMatch) {
    step.thought = finalMatch[1].trim();
    step.isComplete = true;
    return step;
  }

  // Extract ACTION and ACTION_INPUT
  const actionMatch = response.match(/ACTION:\s*(\w+)/i);
  const inputMatch = response.match(/ACTION_INPUT:\s*(\{[\s\S]*?\})/i);

  if (actionMatch) {
    step.action = {
      name: actionMatch[1].trim(),
      data: {},
    };

    if (inputMatch) {
      try {
        step.action.data = JSON.parse(inputMatch[1].trim());
      } catch {
        // If JSON parsing fails, try to extract key-value pairs
        step.action.data = {};
      }
    }
  }

  return step;
}

async function synthesizeFinalAnswer(
  query: string,
  steps: ReActStep[],
  results: Record<string, unknown>
): Promise<string> {
  const observations = steps
    .filter(s => s.observation)
    .map(s => `- ${s.action?.name}: ${s.observation}`)
    .join('\n');

  const synthesisPrompt = `Based on the following observations, provide a comprehensive answer to: "${query}"

Observations:
${observations}

Synthesize these findings into a clear, helpful response. Group by relevant categories if applicable.`;

  const response = await callLLM(synthesisPrompt, 'You are a helpful assistant that synthesizes information into clear summaries.');
  return response;
}

// ============================================================================
// Utility: Check if query needs ReAct
// ============================================================================

export function shouldUseReAct(query: string): boolean {
  // Patterns that indicate complex multi-step tasks
  const complexPatterns = [
    /for each/i,
    /for every/i,
    /all (my |the )?(clients?|contacts?|prospects?|invoices?)/i,
    /summarize.*interactions?/i,
    /prepare.*report/i,
    /analyze.*and.*suggest/i,
    /onboard.*client/i,
    /weekly.*report/i,
    /compare.*across/i,
    /what('s| is) the status of/i,
    /group.*by/i,
  ];

  return complexPatterns.some(pattern => pattern.test(query));
}

// ============================================================================
// Export helper to format steps for display
// ============================================================================

export function formatReActStepsForUser(steps: ReActStep[]): string {
  return steps.map(step => {
    let output = `\n🧠 **Step ${step.iteration}**\n`;
    output += `💭 *Thinking:* ${step.thought.substring(0, 200)}${step.thought.length > 200 ? '...' : ''}\n`;

    if (step.action) {
      output += `⚡ *Action:* ${step.action.name}\n`;
    }

    if (step.observation) {
      const shortObs = step.observation.substring(0, 150);
      output += `👁️ *Result:* ${shortObs}${step.observation.length > 150 ? '...' : ''}\n`;
    }

    return output;
  }).join('\n');
}
