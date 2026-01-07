/**
 * SYNC Orchestrator
 * Central AI brain that routes requests to specialized agents
 * and manages complex multi-agent workflows
 */

import Together from 'together-ai';
import { AgentRegistry } from './registry';
import type {
  AgentConfig,
  AgentContext,
  AgentId,
  AgentMessage,
  AgentResponse,
  AgentTool,
  StreamingChunk,
  ToolHandler,
} from './types';

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface WorkflowStep {
  agentId: AgentId;
  task: string;
  dependsOn?: string[];
  outputKey?: string;
}

export interface WorkflowResult {
  stepId: string;
  agentId: AgentId;
  response: AgentResponse;
  duration: number;
}

export interface OrchestratorConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxDelegationDepth?: number;
}

export interface DelegationResult {
  agentId: AgentId;
  query: string;
  response: AgentResponse;
  success: boolean;
  error?: string;
}

export interface ConversationMemory {
  messages: AgentMessage[];
  delegations: DelegationResult[];
  context: AgentContext;
  startedAt: Date;
  lastActivityAt: Date;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
  temperature: 0.7,
  maxTokens: 4096,
  maxDelegationDepth: 3,
};

const SYNC_SYSTEM_PROMPT = `You are SYNC, the central AI orchestrator for iSyncSO - an intelligent business platform.

Your role is to:
1. Understand user requests and determine the best way to help
2. Route complex tasks to specialized agents when appropriate
3. Coordinate multi-step workflows across agents
4. Synthesize results from multiple agents into coherent responses

Available specialized agents:
- learn: Learning & development, course recommendations, skill tracking, AI tutoring
- growth: Sales pipeline, prospect research, lead scoring, campaign automation
- sentinel: EU AI Act compliance, risk assessment, governance documentation
- finance: Invoice processing, expense tracking, budget forecasting
- raise: Fundraising, investor research, pitch preparation, deal pipeline
- create: AI image generation, marketing creatives, product visuals

Guidelines:
- For simple questions, respond directly without delegation
- For domain-specific tasks, delegate to the appropriate specialist agent
- For complex tasks, break them into steps and coordinate multiple agents
- Always maintain context across the conversation
- Synthesize multi-agent results into a unified response

When delegating, use the delegate_to_agent tool with clear, specific instructions.
For parallel tasks, use run_parallel_workflow.
For sequential multi-step tasks, use run_sequential_workflow.`;

// ============================================================================
// Orchestrator Tools
// ============================================================================

const ORCHESTRATOR_TOOLS: AgentTool[] = [
  {
    type: 'function',
    function: {
      name: 'delegate_to_agent',
      description:
        'Delegate a task to a specialized agent. Use this when the task requires domain expertise.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'The agent to delegate to',
            enum: ['learn', 'growth', 'sentinel', 'finance', 'raise', 'create'],
          },
          query: {
            type: 'string',
            description:
              'The specific task or question for the agent. Be detailed and include relevant context.',
          },
          context: {
            type: 'object',
            description: 'Additional context to pass to the agent',
          },
        },
        required: ['agent_id', 'query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_parallel_workflow',
      description:
        'Run multiple agent tasks in parallel. Use when tasks are independent and can execute simultaneously.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'Array of tasks to run in parallel',
            items: {
              type: 'object',
              description:
                'Task object with agent_id, query, and optional output_key',
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_sequential_workflow',
      description:
        'Run a sequence of agent tasks where each step may depend on previous results.',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            description: 'Ordered array of workflow steps',
            items: {
              type: 'object',
              description:
                'Step object with agent_id, task template, depends_on array, and output_key',
            },
          },
        },
        required: ['steps'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_capabilities',
      description:
        'Get detailed information about what a specific agent can do.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'The agent to get capabilities for',
            enum: ['learn', 'growth', 'sentinel', 'finance', 'raise', 'create'],
          },
        },
        required: ['agent_id'],
      },
    },
  },
];

// ============================================================================
// SyncOrchestrator Class
// ============================================================================

export class SyncOrchestrator {
  private client: Together;
  private config: OrchestratorConfig;
  private conversations: Map<string, ConversationMemory> = new Map();
  private tools: Map<string, ToolHandler> = new Map();
  private currentDelegationDepth = 0;

  constructor(config?: Partial<OrchestratorConfig>, apiKey?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY;
    if (!key) {
      throw new Error('Together API key is required');
    }

    this.client = new Together({ apiKey: key });
    this.registerBuiltInTools();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Process a user message and return a response
   */
  async chat(
    message: string,
    context?: AgentContext,
    conversationId?: string
  ): Promise<AgentResponse> {
    const convId = conversationId || this.generateConversationId();
    const memory = this.getOrCreateConversation(convId, context);

    // Add user message to memory
    memory.messages.push({ role: 'user', content: message });
    memory.lastActivityAt = new Date();

    // Build messages for the API
    const apiMessages = this.buildApiMessages(memory);

    // Get response from the model
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: apiMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      tools: ORCHESTRATOR_TOOLS,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Handle tool calls (delegation, workflows)
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      return this.handleToolCalls(assistantMessage.tool_calls, memory);
    }

    // Store assistant response
    const content = assistantMessage.content || '';
    memory.messages.push({ role: 'assistant', content });

    return {
      content,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason: choice.finish_reason as AgentResponse['finishReason'],
    };
  }

  /**
   * Stream a response
   */
  async *chatStream(
    message: string,
    context?: AgentContext,
    conversationId?: string
  ): AsyncGenerator<StreamingChunk> {
    const convId = conversationId || this.generateConversationId();
    const memory = this.getOrCreateConversation(convId, context);

    memory.messages.push({ role: 'user', content: message });
    memory.lastActivityAt = new Date();

    const apiMessages = this.buildApiMessages(memory);

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: apiMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      tools: ORCHESTRATOR_TOOLS,
      stream: true,
    });

    let fullContent = '';
    let toolCalls: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullContent += delta.content;
        yield { content: delta.content, done: false };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls[tc.index]) {
            toolCalls[tc.index] = {
              id: tc.id || '',
              type: 'function',
              function: { name: tc.function?.name || '', arguments: '' },
            };
          }
          if (tc.function?.arguments) {
            toolCalls[tc.index].function.arguments += tc.function.arguments;
          }
        }
      }

      if (chunk.choices[0]?.finish_reason === 'tool_calls') {
        // Handle tool calls and stream results
        const toolResponse = await this.handleToolCalls(toolCalls, memory);
        yield { content: `\n\n${toolResponse.content}`, done: true };
        return;
      }
    }

    // Store the response
    if (fullContent) {
      memory.messages.push({ role: 'assistant', content: fullContent });
    }

    yield { done: true };
  }

  /**
   * Delegate a task to a specific agent
   */
  async delegateToAgent(
    agentId: AgentId,
    query: string,
    context?: AgentContext
  ): Promise<DelegationResult> {
    if (this.currentDelegationDepth >= (this.config.maxDelegationDepth || 3)) {
      return {
        agentId,
        query,
        response: {
          content: 'Maximum delegation depth reached. Please simplify the request.',
        },
        success: false,
        error: 'MAX_DEPTH_EXCEEDED',
      };
    }

    const agent = AgentRegistry.get(agentId);
    if (!agent) {
      return {
        agentId,
        query,
        response: { content: `Agent "${agentId}" is not available.` },
        success: false,
        error: 'AGENT_NOT_FOUND',
      };
    }

    this.currentDelegationDepth++;

    try {
      const response = await agent.chat(
        [{ role: 'user', content: query }],
        context
      );

      return {
        agentId,
        query,
        response,
        success: true,
      };
    } catch (error) {
      return {
        agentId,
        query,
        response: {
          content: `Error from ${agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      };
    } finally {
      this.currentDelegationDepth--;
    }
  }

  /**
   * Run multiple tasks in parallel
   */
  async runParallelWorkflow(
    tasks: Array<{ agentId: AgentId; query: string; outputKey?: string }>,
    context?: AgentContext
  ): Promise<Map<string, DelegationResult>> {
    const results = new Map<string, DelegationResult>();

    const promises = tasks.map(async (task, index) => {
      const key = task.outputKey || `task_${index}`;
      const result = await this.delegateToAgent(task.agentId, task.query, context);
      return { key, result };
    });

    const settled = await Promise.allSettled(promises);

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.set(outcome.value.key, outcome.value.result);
      }
    }

    return results;
  }

  /**
   * Run a sequential workflow with dependencies
   */
  async runSequentialWorkflow(
    steps: WorkflowStep[],
    context?: AgentContext
  ): Promise<WorkflowResult[]> {
    const results: WorkflowResult[] = [];
    const outputs: Record<string, string> = {};

    for (const step of steps) {
      const startTime = Date.now();

      // Replace placeholders in task with previous outputs
      let task = step.task;
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          const placeholder = `{{${dep}}}`;
          if (task.includes(placeholder) && outputs[dep]) {
            task = task.replace(placeholder, outputs[dep]);
          }
        }
      }

      const delegation = await this.delegateToAgent(step.agentId, task, context);

      const result: WorkflowResult = {
        stepId: step.outputKey || `step_${results.length}`,
        agentId: step.agentId,
        response: delegation.response,
        duration: Date.now() - startTime,
      };

      results.push(result);

      // Store output for dependent steps
      if (step.outputKey) {
        outputs[step.outputKey] = delegation.response.content;
      }
    }

    return results;
  }

  /**
   * Get conversation memory
   */
  getConversation(conversationId: string): ConversationMemory | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Clear a conversation
   */
  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  /**
   * Register a custom tool
   */
  registerTool(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private registerBuiltInTools(): void {
    // delegate_to_agent
    this.tools.set('delegate_to_agent', async (args) => {
      const { agent_id, query, context } = args as {
        agent_id: AgentId;
        query: string;
        context?: Record<string, unknown>;
      };

      const result = await this.delegateToAgent(agent_id, query, context as AgentContext);
      return result;
    });

    // run_parallel_workflow
    this.tools.set('run_parallel_workflow', async (args) => {
      const { tasks } = args as {
        tasks: Array<{ agent_id: AgentId; query: string; output_key?: string }>;
      };

      const normalizedTasks = tasks.map((t) => ({
        agentId: t.agent_id,
        query: t.query,
        outputKey: t.output_key,
      }));

      const results = await this.runParallelWorkflow(normalizedTasks);
      return Object.fromEntries(results);
    });

    // run_sequential_workflow
    this.tools.set('run_sequential_workflow', async (args) => {
      const { steps } = args as {
        steps: Array<{
          agent_id: AgentId;
          task: string;
          depends_on?: string[];
          output_key?: string;
        }>;
      };

      const normalizedSteps: WorkflowStep[] = steps.map((s) => ({
        agentId: s.agent_id,
        task: s.task,
        dependsOn: s.depends_on,
        outputKey: s.output_key,
      }));

      const results = await this.runSequentialWorkflow(normalizedSteps);
      return results;
    });

    // get_agent_capabilities
    this.tools.set('get_agent_capabilities', async (args) => {
      const { agent_id } = args as { agent_id: AgentId };
      const config = AgentRegistry.getConfig(agent_id);

      if (!config) {
        return { error: `Agent "${agent_id}" not found` };
      }

      return {
        id: config.id,
        name: config.name,
        description: config.description,
        capabilities: config.capabilities,
        status: AgentRegistry.getStatus(agent_id),
      };
    });
  }

  private async handleToolCalls(
    toolCalls: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>,
    memory: ConversationMemory
  ): Promise<AgentResponse> {
    const results: string[] = [];

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;
      const handler = this.tools.get(name);

      if (!handler) {
        results.push(`Tool "${name}" not found.`);
        continue;
      }

      try {
        const args = JSON.parse(argsString);
        const result = await handler(args);

        // Track delegation results
        if (name === 'delegate_to_agent' && result) {
          memory.delegations.push(result as DelegationResult);
        }

        // Format result based on tool
        if (name === 'delegate_to_agent') {
          const delegation = result as DelegationResult;
          results.push(delegation.response.content);
        } else if (name === 'run_parallel_workflow') {
          const parallelResults = result as Record<string, DelegationResult>;
          const summaries = Object.entries(parallelResults).map(
            ([key, res]) => `**${key}**: ${res.response.content}`
          );
          results.push(summaries.join('\n\n'));
        } else if (name === 'run_sequential_workflow') {
          const workflowResults = result as WorkflowResult[];
          const lastResult = workflowResults[workflowResults.length - 1];
          results.push(lastResult?.response.content || 'Workflow completed.');
        } else if (name === 'get_agent_capabilities') {
          const capabilities = result as {
            name: string;
            description: string;
            capabilities: string[];
          };
          results.push(
            `**${capabilities.name}**: ${capabilities.description}\n\nCapabilities:\n${capabilities.capabilities.map((c) => `- ${c}`).join('\n')}`
          );
        } else {
          results.push(JSON.stringify(result));
        }
      } catch (error) {
        results.push(
          `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const content = results.join('\n\n');
    memory.messages.push({ role: 'assistant', content });

    return { content };
  }

  private getOrCreateConversation(
    id: string,
    context?: AgentContext
  ): ConversationMemory {
    let memory = this.conversations.get(id);

    if (!memory) {
      memory = {
        messages: [],
        delegations: [],
        context: context || {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      this.conversations.set(id, memory);
    } else if (context) {
      memory.context = { ...memory.context, ...context };
    }

    return memory;
  }

  private buildApiMessages(
    memory: ConversationMemory
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
      [{ role: 'system', content: this.buildSystemPrompt(memory.context) }];

    for (const msg of memory.messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  private buildSystemPrompt(context: AgentContext): string {
    let prompt = SYNC_SYSTEM_PROMPT;

    if (context.userId || context.companyId) {
      prompt += '\n\nCurrent Context:';
      if (context.userId) prompt += `\n- User ID: ${context.userId}`;
      if (context.companyId) prompt += `\n- Company ID: ${context.companyId}`;
      if (context.metadata) {
        prompt += `\n- Additional: ${JSON.stringify(context.metadata)}`;
      }
    }

    return prompt;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let orchestratorInstance: SyncOrchestrator | null = null;

export function getSyncOrchestrator(
  config?: Partial<OrchestratorConfig>,
  apiKey?: string
): SyncOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SyncOrchestrator(config, apiKey);
  }
  return orchestratorInstance;
}

export function resetSyncOrchestrator(): void {
  orchestratorInstance = null;
}
