import { base44 } from '@/api/base44Client';

// Agent configurations
export const AVAILABLE_AGENTS = {
  assistant: {
    name: 'personal_assistant',
    displayName: 'Assistant',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/30',
    icon: '✨',
    description: 'Your personal AI assistant - manages calendar, email, tasks & more',
    capabilities: ['calendar', 'email', 'tasks', 'reminders', 'research', 'integrations']
  },
  sentinel: {
    name: 'sentinel',
    displayName: 'Sentinel',
    color: 'text-[#86EFAC]',
    bgColor: 'bg-[#86EFAC]/20',
    borderColor: 'border-[#86EFAC]/30',
    icon: '🛡️',
    description: 'EU AI Act compliance assistant'
  },
  growth: {
    name: 'growth_assistant',
    displayName: 'Growth',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
    icon: '📈',
    description: 'Sales intelligence assistant'
  },
  learn: {
    name: 'learn_assistant',
    displayName: 'Learn',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    icon: '📚',
    description: 'Learning & courses assistant'
  }
};

// Detect agent mentions in message content
export function detectAgentMentions(content) {
  // Dynamically build regex from available agents
  const agentKeys = Object.keys(AVAILABLE_AGENTS).join('|');
  const agentMentionRegex = new RegExp(`@(${agentKeys})\\b`, 'gi');
  const matches = [];
  let match;
  
  while ((match = agentMentionRegex.exec(content)) !== null) {
    const agentType = match[1].toLowerCase();
    if (AVAILABLE_AGENTS[agentType]) {
      matches.push({
        agentType,
        agent: AVAILABLE_AGENTS[agentType],
        index: match.index,
        fullMatch: match[0]
      });
    }
  }
  
  return matches;
}

// Extract the prompt for the agent (text after @agent mention)
export function extractAgentPrompt(content, agentType) {
  const regex = new RegExp(`@${agentType}\\s+(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : content;
}

// Invoke agent and get response
export async function invokeAgentForChat(agentType, prompt, user, channelContext) {
  const agent = AVAILABLE_AGENTS[agentType];
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  try {
    // For personal assistant, use our custom function that can execute actions
    if (agentType === 'assistant') {
      const response = await base44.functions.invoke('personalAssistant', {
        prompt,
        user_id: user?.id,
        channel_id: channelContext?.channelId,
        channel_name: channelContext?.channelName
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return {
        content: response.data?.response || response.data?.content || 'I processed your request.',
        conversationId: response.data?.conversation_id,
        action_taken: response.data?.action_taken,
        action_result: response.data?.action_result
      };
    }

    // For other agents, use the standard conversation flow
    const conversation = await base44.agents.createConversation({
      agent_name: agent.name,
      metadata: {
        name: `Chat - ${channelContext?.channelName || 'Channel'}`,
        user_id: user?.id,
        channel_id: channelContext?.channelId,
        source: 'inbox_mention'
      }
    });

    // Send the message and wait for response
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: prompt
    });

    // Wait for agent response with polling
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout

      const checkResponse = async () => {
        attempts++;

        try {
          const updatedConversation = await base44.agents.getConversation(conversation.id);
          const messages = updatedConversation.messages || [];

          // Find assistant response
          const assistantMessage = messages.find(m => m.role === 'assistant' && m.content);

          if (assistantMessage) {
            resolve({
              content: assistantMessage.content,
              conversationId: conversation.id
            });
            return;
          }

          if (attempts >= maxAttempts) {
            reject(new Error('Agent response timeout'));
            return;
          }

          // Poll again
          setTimeout(checkResponse, 1000);
        } catch (error) {
          reject(error);
        }
      };

      // Start polling after a short delay
      setTimeout(checkResponse, 2000);
    });
  } catch (error) {
    console.error('Failed to invoke agent:', error);
    throw error;
  }
}

export default {
  AVAILABLE_AGENTS,
  detectAgentMentions,
  extractAgentPrompt,
  invokeAgentForChat
};