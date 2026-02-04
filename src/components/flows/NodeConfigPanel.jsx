/**
 * NodeConfigPanel - Right panel for configuring selected node
 * Renders different forms based on node type
 */

import React, { useState, useEffect } from 'react';
import {
  X, Play, Brain, Mail, Clock, GitBranch,
  Linkedin, MessageSquare, Layers, Edit3, Square,
  Plus, Trash2
} from 'lucide-react';

const NODE_ICONS = {
  trigger: Play,
  start: Play,
  aiAnalysis: Brain,
  ai_analysis: Brain,
  research: Brain,
  sendEmail: Mail,
  send_email: Mail,
  timer: Clock,
  delay: Clock,
  condition: GitBranch,
  branch: GitBranch,
  linkedin: Linkedin,
  linkedinMessage: Linkedin,
  sms: MessageSquare,
  followUp: Layers,
  follow_up: Layers,
  updateStatus: Edit3,
  update_status: Edit3,
  end: Square
};

const NODE_TITLES = {
  trigger: 'Trigger Settings',
  start: 'Trigger Settings',
  aiAnalysis: 'AI Analysis Settings',
  ai_analysis: 'AI Analysis Settings',
  research: 'Research Settings',
  sendEmail: 'Email Settings',
  send_email: 'Email Settings',
  timer: 'Timer Settings',
  delay: 'Timer Settings',
  condition: 'Condition Settings',
  branch: 'Condition Settings',
  linkedin: 'LinkedIn Settings',
  linkedinMessage: 'LinkedIn Settings',
  sms: 'SMS Settings',
  followUp: 'Follow-up Settings',
  follow_up: 'Follow-up Settings',
  updateStatus: 'Status Update Settings',
  update_status: 'Status Update Settings',
  end: 'End Node Settings'
};

// Form field components
function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const Component = multiline ? 'textarea' : 'input';
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <Component
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700
          text-sm text-white placeholder-zinc-500
          focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30
          ${multiline ? 'resize-none min-h-[100px]' : ''}
        `}
        rows={multiline ? 4 : undefined}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0, max, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-500"
      />
    </div>
  );
}

// Node-specific config forms
function TriggerConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Start Flow"
      />
      <SelectField
        label="Trigger Type"
        value={data.trigger_type}
        onChange={(v) => onChange({ ...data, trigger_type: v })}
        options={[
          { value: 'manual', label: 'Manual Start' },
          { value: 'new_prospect', label: 'New Prospect Added' },
          { value: 'scheduled', label: 'Scheduled Time' },
          { value: 'webhook', label: 'External Webhook' }
        ]}
      />
    </div>
  );
}

function AIAnalysisConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Analyze Prospect"
      />
      <TextField
        label="Prompt"
        value={data.prompt}
        onChange={(v) => onChange({ ...data, prompt: v })}
        placeholder="Enter your prompt for Claude..."
        multiline
      />
      <SelectField
        label="Model"
        value={data.model}
        onChange={(v) => onChange({ ...data, model: v })}
        options={[
          { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet' },
          { value: 'claude-3-haiku-20240307', label: 'Claude Haiku (faster)' }
        ]}
      />
    </div>
  );
}

function SendEmailConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Initial Outreach"
      />
      <SelectField
        label="Email Type"
        value={data.email_type}
        onChange={(v) => onChange({ ...data, email_type: v })}
        options={[
          { value: 'cold_outreach', label: 'Cold Outreach' },
          { value: 'follow_up', label: 'Follow-up' },
          { value: 'meeting_request', label: 'Meeting Request' },
          { value: 'value_add', label: 'Value Add' },
          { value: 'custom', label: 'Custom' }
        ]}
      />
      <TextField
        label="Subject Template"
        value={data.subject}
        onChange={(v) => onChange({ ...data, subject: v })}
        placeholder="e.g., Quick question about {{company}}"
      />
      <TextField
        label="Key Points"
        value={data.key_points?.join(', ')}
        onChange={(v) => onChange({ ...data, key_points: v.split(',').map(s => s.trim()).filter(Boolean) })}
        placeholder="pain points, value prop, CTA"
      />
      <SelectField
        label="Tone"
        value={data.tone}
        onChange={(v) => onChange({ ...data, tone: v })}
        options={[
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'urgent', label: 'Urgent' }
        ]}
      />
    </div>
  );
}

function TimerConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Wait 3 days"
      />
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="Days"
          value={data.delay_days}
          onChange={(v) => onChange({ ...data, delay_days: v })}
          min={0}
          max={365}
        />
        <NumberField
          label="Hours"
          value={data.delay_hours}
          onChange={(v) => onChange({ ...data, delay_hours: v })}
          min={0}
          max={23}
        />
        <NumberField
          label="Minutes"
          value={data.delay_minutes}
          onChange={(v) => onChange({ ...data, delay_minutes: v })}
          min={0}
          max={59}
        />
      </div>
    </div>
  );
}

function ConditionConfig({ data, onChange }) {
  const conditions = data.conditions || [];

  const addCondition = () => {
    onChange({
      ...data,
      conditions: [...conditions, { field: '', operator: 'equals', value: '', branch: 'true' }]
    });
  };

  const updateCondition = (index, updates) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...data, conditions: newConditions });
  };

  const removeCondition = (index) => {
    onChange({ ...data, conditions: conditions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Check Response"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">Conditions</label>
          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {conditions.map((condition, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Condition {idx + 1}</span>
              <button
                onClick={() => removeCondition(idx)}
                className="p-1 hover:bg-zinc-700 rounded"
              >
                <Trash2 className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
            <TextField
              label="Field"
              value={condition.field}
              onChange={(v) => updateCondition(idx, { field: v })}
              placeholder="e.g., prospect.industry"
            />
            <SelectField
              label="Operator"
              value={condition.operator}
              onChange={(v) => updateCondition(idx, { operator: v })}
              options={[
                { value: 'equals', label: 'Equals' },
                { value: 'not_equals', label: 'Not Equals' },
                { value: 'contains', label: 'Contains' },
                { value: 'is_empty', label: 'Is Empty' },
                { value: 'is_not_empty', label: 'Is Not Empty' }
              ]}
            />
            <TextField
              label="Value"
              value={condition.value}
              onChange={(v) => updateCondition(idx, { value: v })}
              placeholder="Value to compare"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedInConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Connection Request"
      />
      <SelectField
        label="Message Type"
        value={data.message_type}
        onChange={(v) => onChange({ ...data, message_type: v })}
        options={[
          { value: 'connection_request', label: 'Connection Request (300 chars)' },
          { value: 'direct_message', label: 'Direct Message (1900 chars)' },
          { value: 'inmail', label: 'InMail (1900 chars)' }
        ]}
      />
      <TextField
        label="Message Prompt"
        value={data.prompt}
        onChange={(v) => onChange({ ...data, prompt: v })}
        placeholder="AI prompt for message generation..."
        multiline
      />
    </div>
  );
}

function SMSConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Quick SMS"
      />
      <TextField
        label="Message Prompt"
        value={data.prompt}
        onChange={(v) => onChange({ ...data, prompt: v })}
        placeholder="AI prompt for SMS generation..."
        multiline
      />
      <TextField
        label="From Number"
        value={data.from_number}
        onChange={(v) => onChange({ ...data, from_number: v })}
        placeholder="Leave empty for default"
      />
    </div>
  );
}

function FollowUpConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Follow-up #1"
      />
      <SelectField
        label="Channel"
        value={data.channel}
        onChange={(v) => onChange({ ...data, channel: v })}
        options={[
          { value: 'email', label: 'Email' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'sms', label: 'SMS' }
        ]}
      />
      <TextField
        label="Prompt"
        value={data.prompt}
        onChange={(v) => onChange({ ...data, prompt: v })}
        placeholder="AI prompt for follow-up..."
        multiline
      />
      <NumberField
        label="Follow-up Number"
        value={data.follow_up_count}
        onChange={(v) => onChange({ ...data, follow_up_count: v })}
        min={1}
        max={10}
      />
    </div>
  );
}

function UpdateStatusConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Mark as Contacted"
      />
      <SelectField
        label="New Status"
        value={data.status}
        onChange={(v) => onChange({ ...data, status: v })}
        options={[
          { value: 'new', label: 'New' },
          { value: 'contacted', label: 'Contacted' },
          { value: 'engaged', label: 'Engaged' },
          { value: 'qualified', label: 'Qualified' },
          { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
          { value: 'won', label: 'Won' },
          { value: 'lost', label: 'Lost' }
        ]}
      />
      <TextField
        label="Notes"
        value={data.notes}
        onChange={(v) => onChange({ ...data, notes: v })}
        placeholder="Add notes to prospect..."
        multiline
      />
    </div>
  );
}

function EndConfig({ data, onChange }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Name"
        value={data.name}
        onChange={(v) => onChange({ ...data, name: v })}
        placeholder="e.g., Flow Complete"
      />
    </div>
  );
}

// Config component map
const CONFIG_COMPONENTS = {
  trigger: TriggerConfig,
  start: TriggerConfig,
  aiAnalysis: AIAnalysisConfig,
  ai_analysis: AIAnalysisConfig,
  research: AIAnalysisConfig,
  sendEmail: SendEmailConfig,
  send_email: SendEmailConfig,
  timer: TimerConfig,
  delay: TimerConfig,
  condition: ConditionConfig,
  branch: ConditionConfig,
  linkedin: LinkedInConfig,
  linkedinMessage: LinkedInConfig,
  sms: SMSConfig,
  followUp: FollowUpConfig,
  follow_up: FollowUpConfig,
  updateStatus: UpdateStatusConfig,
  update_status: UpdateStatusConfig,
  end: EndConfig
};

export default function NodeConfigPanel({
  node,
  onClose,
  onUpdate,
  className = ''
}) {
  const [localData, setLocalData] = useState(node?.data || {});

  // Sync local data when node changes
  useEffect(() => {
    setLocalData(node?.data || {});
  }, [node?.id]);

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (node && onUpdate) {
        onUpdate(node.id, localData);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localData, node?.id, onUpdate]);

  if (!node) return null;

  const Icon = NODE_ICONS[node.type] || Square;
  const title = NODE_TITLES[node.type] || 'Node Settings';
  const ConfigComponent = CONFIG_COMPONENTS[node.type];

  return (
    <div className={`
      flex flex-col h-full bg-zinc-900/50 border-l border-zinc-800
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {ConfigComponent ? (
          <ConfigComponent data={localData} onChange={setLocalData} />
        ) : (
          <p className="text-sm text-zinc-400">
            No configuration available for this node type.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-500">
          Node ID: {node.id}
        </p>
      </div>
    </div>
  );
}
