/**
 * Flow Node Components Index
 * Exports all custom node types for React Flow
 */

import TriggerNode from './TriggerNode';
import AIAnalysisNode from './AIAnalysisNode';
import SendEmailNode from './SendEmailNode';
import TimerNode from './TimerNode';
import ConditionNode from './ConditionNode';
import LinkedInNode from './LinkedInNode';
import SMSNode from './SMSNode';
import FollowUpNode from './FollowUpNode';
import UpdateStatusNode from './UpdateStatusNode';
import EndNode from './EndNode';

// Re-export components
export {
  TriggerNode,
  AIAnalysisNode,
  SendEmailNode,
  TimerNode,
  ConditionNode,
  LinkedInNode,
  SMSNode,
  FollowUpNode,
  UpdateStatusNode,
  EndNode
};

// Node type mapping for React Flow
export const nodeTypes = {
  // Trigger variants
  trigger: TriggerNode,
  start: TriggerNode,

  // AI nodes
  aiAnalysis: AIAnalysisNode,
  ai_analysis: AIAnalysisNode,
  research: AIAnalysisNode,
  researchProspect: AIAnalysisNode,

  // Communication nodes
  sendEmail: SendEmailNode,
  send_email: SendEmailNode,
  linkedinMessage: LinkedInNode,
  linkedin: LinkedInNode,
  sms: SMSNode,

  // Flow control
  timer: TimerNode,
  delay: TimerNode,
  condition: ConditionNode,
  branch: ConditionNode,
  followUp: FollowUpNode,
  follow_up: FollowUpNode,

  // Actions
  updateStatus: UpdateStatusNode,
  update_status: UpdateStatusNode,

  // Termination
  end: EndNode
};

// Node palette configuration
export const nodePaletteConfig = [
  {
    category: 'Flow Control',
    nodes: [
      {
        type: 'trigger',
        label: 'Trigger',
        description: 'Start point for the flow',
        color: 'emerald'
      },
      {
        type: 'timer',
        label: 'Timer/Delay',
        description: 'Wait before next step',
        color: 'orange'
      },
      {
        type: 'condition',
        label: 'Condition',
        description: 'Branch based on conditions',
        color: 'yellow'
      },
      {
        type: 'end',
        label: 'End',
        description: 'End the flow',
        color: 'red'
      }
    ]
  },
  {
    category: 'AI & Analysis',
    nodes: [
      {
        type: 'aiAnalysis',
        label: 'AI Analysis',
        description: 'Claude-powered analysis',
        color: 'purple'
      },
      {
        type: 'research',
        label: 'Research',
        description: 'Research prospect/company',
        color: 'purple'
      }
    ]
  },
  {
    category: 'Communication',
    nodes: [
      {
        type: 'sendEmail',
        label: 'Send Email',
        description: 'Send personalized email',
        color: 'blue'
      },
      {
        type: 'linkedin',
        label: 'LinkedIn',
        description: 'Send LinkedIn message',
        color: 'linkedin'
      },
      {
        type: 'sms',
        label: 'SMS',
        description: 'Send SMS message',
        color: 'teal'
      },
      {
        type: 'followUp',
        label: 'Follow Up',
        description: 'Multi-step follow-up',
        color: 'indigo'
      }
    ]
  },
  {
    category: 'Actions',
    nodes: [
      {
        type: 'updateStatus',
        label: 'Update Status',
        description: 'Update prospect status',
        color: 'zinc'
      }
    ]
  }
];
