/**
 * AgentRegistry
 * Central registry for managing agent instances and configurations
 */

import { BaseAgent } from './base-agent';
import type {
  AgentConfig,
  AgentId,
  AgentRegistryEntry,
  AgentStatus,
  BaseAgentInterface,
  ToolHandler,
} from './types';

class AgentRegistryClass {
  private agents: Map<AgentId, AgentRegistryEntry> = new Map();
  private apiKey?: string;

  /**
   * Set the API key for agent instances
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Register an agent configuration
   */
  register(config: AgentConfig, status: AgentStatus = 'active'): void {
    if (this.agents.has(config.id)) {
      console.warn(`Agent "${config.id}" is already registered. Updating.`);
    }

    this.agents.set(config.id, {
      config,
      status,
      instance: undefined,
    });
  }

  /**
   * Get an agent instance (creates lazily if needed)
   */
  get(id: AgentId): BaseAgentInterface | undefined {
    const entry = this.agents.get(id);
    if (!entry) {
      return undefined;
    }

    if (entry.status !== 'active') {
      console.warn(`Agent "${id}" is not active (status: ${entry.status})`);
      return undefined;
    }

    // Lazy instantiation
    if (!entry.instance) {
      entry.instance = new BaseAgent(entry.config, this.apiKey);
    }

    return entry.instance;
  }

  /**
   * Get agent configuration
   */
  getConfig(id: AgentId): AgentConfig | undefined {
    return this.agents.get(id)?.config;
  }

  /**
   * Get agent status
   */
  getStatus(id: AgentId): AgentStatus | undefined {
    return this.agents.get(id)?.status;
  }

  /**
   * Update agent status
   */
  setStatus(id: AgentId, status: AgentStatus): void {
    const entry = this.agents.get(id);
    if (entry) {
      entry.status = status;
      // Clear instance if deactivating
      if (status !== 'active') {
        entry.instance = undefined;
      }
    }
  }

  /**
   * Register a tool handler for a specific agent
   */
  registerTool(agentId: AgentId, toolName: string, handler: ToolHandler): void {
    const agent = this.get(agentId);
    if (agent) {
      agent.registerTool(toolName, handler);
    } else {
      console.warn(`Cannot register tool: Agent "${agentId}" not found`);
    }
  }

  /**
   * Register a tool handler for all agents
   */
  registerGlobalTool(toolName: string, handler: ToolHandler): void {
    for (const [id] of this.agents) {
      this.registerTool(id, toolName, handler);
    }
  }

  /**
   * List all registered agents
   */
  list(): { id: AgentId; config: AgentConfig; status: AgentStatus }[] {
    return Array.from(this.agents.entries()).map(([id, entry]) => ({
      id,
      config: entry.config,
      status: entry.status,
    }));
  }

  /**
   * List active agents only
   */
  listActive(): { id: AgentId; config: AgentConfig }[] {
    return this.list()
      .filter((a) => a.status === 'active')
      .map(({ id, config }) => ({ id, config }));
  }

  /**
   * Unregister an agent
   */
  unregister(id: AgentId): boolean {
    return this.agents.delete(id);
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }

  /**
   * Check if an agent exists
   */
  has(id: AgentId): boolean {
    return this.agents.has(id);
  }

  /**
   * Get the count of registered agents
   */
  get size(): number {
    return this.agents.size;
  }
}

// Singleton export
export const AgentRegistry = new AgentRegistryClass();

// Export the class for testing
export { AgentRegistryClass };
