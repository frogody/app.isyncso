/**
 * BaseAgent Class
 * Foundation for all specialized agents in iSyncSO
 */

import Together from 'together-ai';
import type {
  AgentConfig,
  AgentContext,
  AgentId,
  AgentMessage,
  AgentResponse,
  BaseAgentInterface,
  StreamingChunk,
  ToolCall,
  ToolHandler,
  ToolRegistry,
} from './types';

export class BaseAgent implements BaseAgentInterface {
  readonly id: AgentId;
  readonly config: AgentConfig;

  private client: Together;
  private tools: ToolRegistry = {};

  constructor(config: AgentConfig, apiKey?: string) {
    this.id = config.id;
    this.config = config;

    const key = apiKey || import.meta.env.VITE_TOGETHER_API_KEY;
    if (!key) {
      throw new Error('Together API key is required');
    }

    this.client = new Together({ apiKey: key });
  }

  /**
   * Send a chat message and get a response
   */
  async chat(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<AgentResponse> {
    const systemMessage = this.buildSystemMessage(context);
    const formattedMessages = this.formatMessages(systemMessage, messages);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: formattedMessages,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 2048,
      tools: this.config.tools,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Handle tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolResults = await this.handleToolCalls(message.tool_calls);

      // Continue conversation with tool results
      const updatedMessages: AgentMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: message.content || '',
          toolCalls: message.tool_calls.map((tc) => ({
            id: tc.id,
            type: tc.type as 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        },
        ...toolResults.map((result) => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          toolCallId: result.toolCallId,
        })),
      ];

      return this.chat(updatedMessages, context);
    }

    return {
      content: message.content || '',
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
   * Stream a chat response
   */
  async *chatStream(
    messages: AgentMessage[],
    context?: AgentContext
  ): AsyncGenerator<StreamingChunk> {
    const systemMessage = this.buildSystemMessage(context);
    const formattedMessages = this.formatMessages(systemMessage, messages);

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: formattedMessages,
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 2048,
      tools: this.config.tools,
      stream: true,
    });

    let accumulatedToolCalls: Partial<ToolCall>[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!accumulatedToolCalls[tc.index]) {
            accumulatedToolCalls[tc.index] = {
              id: tc.id,
              type: 'function',
              function: { name: tc.function?.name || '', arguments: '' },
            };
          }
          if (tc.function?.arguments) {
            accumulatedToolCalls[tc.index].function!.arguments +=
              tc.function.arguments;
          }
        }
      }

      yield {
        content: delta?.content || undefined,
        toolCalls:
          accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
        done: chunk.choices[0]?.finish_reason !== null,
      };
    }

    // Handle tool calls after streaming completes
    if (accumulatedToolCalls.length > 0) {
      const completedToolCalls = accumulatedToolCalls.filter(
        (tc): tc is ToolCall =>
          tc.id !== undefined && tc.function?.name !== undefined
      );

      if (completedToolCalls.length > 0) {
        const toolResults = await this.handleToolCalls(
          completedToolCalls.map((tc) => ({
            id: tc.id!,
            type: 'function' as const,
            function: {
              name: tc.function!.name!,
              arguments: tc.function!.arguments || '{}',
            },
          }))
        );

        // Yield tool results
        for (const result of toolResults) {
          yield {
            content: `Tool ${result.toolName}: ${JSON.stringify(result.result)}`,
            done: false,
          };
        }
      }
    }
  }

  /**
   * Register a tool handler
   */
  registerTool(name: string, handler: ToolHandler): void {
    this.tools[name] = handler;
  }

  /**
   * Execute a registered tool
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const handler = this.tools[name];
    if (!handler) {
      throw new Error(`Tool "${name}" is not registered`);
    }
    return handler(args);
  }

  /**
   * Build the system message with context
   */
  private buildSystemMessage(context?: AgentContext): string {
    let systemPrompt = this.config.systemPrompt;

    if (context) {
      const contextParts: string[] = [];

      if (context.userId) {
        contextParts.push(`User ID: ${context.userId}`);
      }
      if (context.companyId) {
        contextParts.push(`Company ID: ${context.companyId}`);
      }
      if (context.metadata) {
        contextParts.push(`Context: ${JSON.stringify(context.metadata)}`);
      }

      if (contextParts.length > 0) {
        systemPrompt += `\n\nCurrent Context:\n${contextParts.join('\n')}`;
      }
    }

    return systemPrompt;
  }

  /**
   * Format messages for the API
   */
  private formatMessages(
    systemMessage: string,
    messages: AgentMessage[]
  ): Together.Chat.Completions.CompletionCreateParams.Message[] {
    const formatted: Together.Chat.Completions.CompletionCreateParams.Message[] =
      [{ role: 'system', content: systemMessage }];

    for (const msg of messages) {
      if (msg.role === 'tool') {
        formatted.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId || '',
        });
      } else if (msg.role === 'assistant' && msg.toolCalls) {
        formatted.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        });
      } else {
        formatted.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return formatted;
  }

  /**
   * Handle tool calls from the model
   */
  private async handleToolCalls(
    toolCalls: {
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }[]
  ): Promise<{ toolCallId: string; toolName: string; result: unknown }[]> {
    const results: { toolCallId: string; toolName: string; result: unknown }[] =
      [];

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;

      try {
        const args = JSON.parse(argsString);
        const result = await this.executeTool(name, args);
        results.push({
          toolCallId: toolCall.id,
          toolName: name,
          result,
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          toolName: name,
          result: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return results;
  }
}
