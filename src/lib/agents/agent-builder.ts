/**
 * Agent Builder
 * Dynamically creates new agents from natural language descriptions using LLM
 */

import Together from 'together-ai';
import { AgentRegistry } from './registry';
import { BaseAgent } from './base-agent';
import type { AgentConfig, AgentId, AgentTool } from './types';

// ============================================================================
// Types
// ============================================================================

export interface AgentSpec {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  tools: ToolSpec[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: ParameterSpec[];
  returnType: string;
  implementation: string; // Mock implementation code
}

export interface ParameterSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enumValues?: string[];
}

export interface AgentBuilderOptions {
  apiKey?: string;
  model?: string;
  autoRegister?: boolean;
  outputPath?: string;
}

export interface GeneratedAgent {
  spec: AgentSpec;
  code: string;
  config: AgentConfig;
  instance?: BaseAgent;
}

export interface BuilderContext {
  domain?: string;
  existingAgents?: string[];
  companyContext?: string;
  integrations?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';

const SPEC_GENERATION_PROMPT = `You are an expert AI agent architect. Your task is to design a specialized agent based on a natural language description.

Given a description of what the agent should do, generate a complete agent specification in JSON format.

The specification must include:
1. id: A short lowercase identifier (e.g., "sales", "support", "analytics")
2. name: A descriptive name (e.g., "Sales Agent", "Customer Support Agent")
3. description: A one-line description of the agent's purpose
4. systemPrompt: A detailed system prompt that defines the agent's personality, capabilities, and behavior guidelines
5. capabilities: An array of 3-7 key capabilities the agent has
6. tools: An array of tool specifications, each with:
   - name: snake_case function name
   - description: What the tool does
   - parameters: Array of parameter specs with name, type, description, required
   - returnType: What the tool returns
   - implementation: A mock TypeScript implementation

Guidelines for tool design:
- Each tool should do ONE thing well
- Use descriptive names that indicate the action (verb_noun pattern)
- Include proper TypeScript types
- Mock implementations should return realistic sample data
- Consider error cases in implementations

Output ONLY valid JSON, no markdown or explanation.`;

const CODE_GENERATION_PROMPT = `You are an expert TypeScript developer. Generate a complete agent implementation file based on the provided specification.

Follow these patterns:
1. Use the same structure as other iSyncSO agents
2. Include proper TypeScript types for all interfaces
3. Implement mock data stores using Map<string, T>
4. Use async functions for all tool implementations
5. Include the BaseAgent extension pattern
6. Export register function, config, and tools
7. Add JSDoc comments for documentation

The code should be production-ready and follow best practices.
Output ONLY the TypeScript code, no markdown code blocks or explanation.`;

// ============================================================================
// Agent Builder Class
// ============================================================================

export class AgentBuilder {
  private client: Together;
  private model: string;
  private autoRegister: boolean;

  constructor(options: AgentBuilderOptions = {}) {
    const apiKey = options.apiKey || process.env.TOGETHER_API_KEY || '';
    this.client = new Together({ apiKey });
    this.model = options.model || DEFAULT_MODEL;
    this.autoRegister = options.autoRegister ?? false;
  }

  /**
   * Build a new agent from a natural language description
   */
  async build(
    description: string,
    context?: BuilderContext
  ): Promise<GeneratedAgent> {
    // Step 1: Generate agent specification
    const spec = await this.generateSpec(description, context);

    // Step 2: Generate TypeScript code
    const code = await this.generateCode(spec);

    // Step 3: Create runtime config
    const config = this.specToConfig(spec);

    // Step 4: Optionally create and register instance
    let instance: BaseAgent | undefined;
    if (this.autoRegister) {
      instance = await this.registerAgent(spec, config);
    }

    return { spec, code, config, instance };
  }

  /**
   * Generate agent specification from description
   */
  async generateSpec(
    description: string,
    context?: BuilderContext
  ): Promise<AgentSpec> {
    const contextInfo = context
      ? `
Context:
- Domain: ${context.domain || 'General business'}
- Existing agents: ${context.existingAgents?.join(', ') || 'None specified'}
- Company context: ${context.companyContext || 'B2B SaaS company'}
- Available integrations: ${context.integrations?.join(', ') || 'Standard APIs'}
`
      : '';

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SPEC_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Create an agent specification for the following:

Description: ${description}
${contextInfo}

Generate the complete JSON specification.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as AgentSpec;
    } catch (error) {
      throw new Error(`Failed to parse agent specification: ${error}`);
    }
  }

  /**
   * Generate TypeScript code from specification
   */
  async generateCode(spec: AgentSpec): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: CODE_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Generate a complete TypeScript agent implementation file for:

${JSON.stringify(spec, null, 2)}

Use this template structure:
- Import statements (BaseAgent, AgentRegistry, types)
- Type definitions section
- Constants section
- Mock data store section
- Tool implementation functions
- Agent tools definition array
- Agent config object
- Agent class extending BaseAgent
- Registration function
- Exports`,
        },
      ],
      temperature: 0.5,
      max_tokens: 8192,
    });

    let code = response.choices[0]?.message?.content || '';

    // Clean up any markdown code blocks
    code = code.replace(/^```typescript\n?/gm, '').replace(/^```\n?/gm, '');

    return code;
  }

  /**
   * Convert spec to runtime AgentConfig
   */
  specToConfig(spec: AgentSpec): AgentConfig {
    const tools: AgentTool[] = spec.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce(
            (acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
                ...(param.enumValues ? { enum: param.enumValues } : {}),
              };
              return acc;
            },
            {} as Record<string, unknown>
          ),
          required: tool.parameters
            .filter((p) => p.required)
            .map((p) => p.name),
        },
      },
    }));

    return {
      id: spec.id as AgentId,
      name: spec.name,
      description: spec.description,
      systemPrompt: spec.systemPrompt,
      model: spec.model || DEFAULT_MODEL,
      temperature: spec.temperature ?? 0.7,
      maxTokens: spec.maxTokens ?? 2048,
      capabilities: spec.capabilities,
      tools,
    };
  }

  /**
   * Create and register a dynamic agent instance
   */
  async registerAgent(
    spec: AgentSpec,
    config: AgentConfig
  ): Promise<BaseAgent> {
    // Create a dynamic agent class
    class DynamicAgent extends BaseAgent {
      constructor(apiKey?: string) {
        super(config, apiKey);

        // Register mock tool implementations
        for (const tool of spec.tools) {
          this.registerTool(tool.name, this.createMockImplementation(tool));
        }
      }

      private createMockImplementation(tool: ToolSpec): (args: unknown) => Promise<unknown> {
        // Create a mock function based on the tool spec
        return async (args: unknown) => {
          console.log(`[${spec.name}] Executing ${tool.name} with:`, args);

          // Return mock data based on return type
          const mockData = this.generateMockReturn(tool.returnType, tool.name);
          return mockData;
        };
      }

      private generateMockReturn(returnType: string, toolName: string): unknown {
        // Generate realistic mock data based on return type hints
        if (returnType.includes('[]') || returnType.includes('Array')) {
          return { items: [], total: 0 };
        }
        if (returnType.includes('boolean')) {
          return { success: true };
        }
        if (returnType.includes('number')) {
          return { value: Math.floor(Math.random() * 100) };
        }
        return {
          id: `${toolName}_${Date.now()}`,
          status: 'completed',
          message: `Mock result for ${toolName}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Register with the agent registry
    AgentRegistry.register(config, 'active');

    // Create and return instance
    const instance = new DynamicAgent();
    return instance;
  }

  /**
   * Validate an agent specification
   */
  validateSpec(spec: AgentSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!spec.id || typeof spec.id !== 'string') {
      errors.push('Missing or invalid agent id');
    }

    if (!spec.name || typeof spec.name !== 'string') {
      errors.push('Missing or invalid agent name');
    }

    if (!spec.description || typeof spec.description !== 'string') {
      errors.push('Missing or invalid description');
    }

    if (!spec.systemPrompt || spec.systemPrompt.length < 50) {
      errors.push('System prompt too short or missing');
    }

    if (!Array.isArray(spec.capabilities) || spec.capabilities.length === 0) {
      errors.push('Must have at least one capability');
    }

    if (!Array.isArray(spec.tools) || spec.tools.length === 0) {
      errors.push('Must have at least one tool');
    }

    for (const tool of spec.tools || []) {
      if (!tool.name || !/^[a-z_]+$/.test(tool.name)) {
        errors.push(`Invalid tool name: ${tool.name}`);
      }
      if (!tool.description) {
        errors.push(`Tool ${tool.name} missing description`);
      }
      if (!Array.isArray(tool.parameters)) {
        errors.push(`Tool ${tool.name} missing parameters array`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Refine an existing specification based on feedback
   */
  async refineSpec(
    spec: AgentSpec,
    feedback: string
  ): Promise<AgentSpec> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SPEC_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Here is an existing agent specification:

${JSON.stringify(spec, null, 2)}

Please refine it based on this feedback:
${feedback}

Output the updated JSON specification only.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as AgentSpec;
    } catch (error) {
      throw new Error(`Failed to parse refined specification: ${error}`);
    }
  }

  /**
   * Generate suggested agents based on business context
   */
  async suggestAgents(
    businessDescription: string,
    existingAgents: string[] = []
  ): Promise<Array<{ name: string; description: string; priority: 'high' | 'medium' | 'low' }>> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a business automation expert. Suggest specialized AI agents that would benefit a business.
Output a JSON array of suggestions with name, description, and priority (high/medium/low).`,
        },
        {
          role: 'user',
          content: `Business: ${businessDescription}

Existing agents: ${existingAgents.join(', ') || 'None'}

Suggest 3-5 new agents that would add value. Consider gaps in coverage.
Output JSON array only.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let defaultBuilder: AgentBuilder | null = null;

/**
 * Get or create the default agent builder instance
 */
export function getAgentBuilder(options?: AgentBuilderOptions): AgentBuilder {
  if (!defaultBuilder) {
    defaultBuilder = new AgentBuilder(options);
  }
  return defaultBuilder;
}

/**
 * Quick build an agent from description
 */
export async function quickBuildAgent(
  description: string,
  options?: AgentBuilderOptions & { context?: BuilderContext }
): Promise<GeneratedAgent> {
  const builder = new AgentBuilder(options);
  return builder.build(description, options?.context);
}

/**
 * Generate just the specification without code
 */
export async function generateAgentSpec(
  description: string,
  context?: BuilderContext
): Promise<AgentSpec> {
  const builder = getAgentBuilder();
  return builder.generateSpec(description, context);
}

/**
 * Generate code from an existing specification
 */
export async function generateAgentCode(spec: AgentSpec): Promise<string> {
  const builder = getAgentBuilder();
  return builder.generateCode(spec);
}

// ============================================================================
// Exports
// ============================================================================

export { AgentBuilder as default };
