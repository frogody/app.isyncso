import React, { useState } from 'react';
import { 
  TrendingUp, Zap, Mail, Clock, Target, Sparkles, Copy, Check,
  Users, Filter, Bell, GitBranch, Play, Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none" />
  </div>
);

const HubSpotWorkflowRide = () => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    workflowType: 'lead-nurture',
    workflowName: '',
    triggerType: 'form',
    triggerDetails: '',
    targetAudience: '',
    goal: '',
    sequenceLength: 5,
    includeBranching: true,
    includeScoring: true,
    includeInternal: true,
    delayType: 'days',
    crmActions: []
  });

  const WORKFLOW_TYPES = [
    { id: 'lead-nurture', label: 'Lead Nurture', icon: Users, desc: 'Convert leads to MQLs' },
    { id: 'onboarding', label: 'Customer Onboarding', icon: Play, desc: 'Activate new customers' },
    { id: 'reengagement', label: 'Re-engagement', icon: Bell, desc: 'Win back cold leads' },
    { id: 'upsell', label: 'Upsell/Cross-sell', icon: TrendingUp, desc: 'Expand existing customers' }
  ];

  const TRIGGERS = [
    { id: 'form', label: 'Form Submission' },
    { id: 'pageview', label: 'Page View' },
    { id: 'property', label: 'Property Change' },
    { id: 'list', label: 'List Membership' },
    { id: 'deal', label: 'Deal Stage Change' },
    { id: 'date', label: 'Date-based' }
  ];

  const CRM_ACTIONS = [
    'Update contact property', 'Create task', 'Send internal email',
    'Update deal stage', 'Add to list', 'Remove from list',
    'Set lead score', 'Assign owner', 'Create ticket'
  ];

  const steps = [
    { title: 'Type', icon: Zap },
    { title: 'Trigger', icon: Target },
    { title: 'Actions', icon: Settings },
    { title: 'Generate', icon: Sparkles }
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const generatePrompt = () => {
    const workflowConfig = WORKFLOW_TYPES.find(w => w.id === config.workflowType);
    
    const p = `# HUBSPOT WORKFLOW BUILDER GUIDE

## WORKFLOW OVERVIEW
- Name: ${config.workflowName || `${workflowConfig?.label} Workflow`}
- Type: ${workflowConfig?.label}
- Goal: ${config.goal || workflowConfig?.desc}
- Target: ${config.targetAudience || '[Target audience]'}

---

## STEP-BY-STEP HUBSPOT SETUP

### 1. CREATE NEW WORKFLOW
1. Go to **Automation → Workflows**
2. Click **Create workflow**
3. Choose **Contact-based** (or Deal-based for sales workflows)
4. Select **Blank workflow**
5. Name it: "${config.workflowName || `${workflowConfig?.label} Workflow`}"

### 2. SET ENROLLMENT TRIGGER
**Trigger Type: ${TRIGGERS.find(t => t.id === config.triggerType)?.label}**

${config.triggerType === 'form' ? `
In HubSpot:
1. Click "Set enrollment triggers"
2. Select "Form submission"
3. Choose: ${config.triggerDetails || '[specific form]'}
4. Add filter: Contact property "Marketing contact status" is "Marketing contact"
` : config.triggerType === 'pageview' ? `
In HubSpot:
1. Click "Set enrollment triggers"
2. Select "Page view"
3. URL contains: ${config.triggerDetails || '[page URL]'}
4. Set view threshold (e.g., 2+ views)
` : config.triggerType === 'property' ? `
In HubSpot:
1. Click "Set enrollment triggers"
2. Select "Contact property value"
3. Property: ${config.triggerDetails || '[property name]'}
4. Condition: is any of / equals / contains
` : config.triggerType === 'list' ? `
In HubSpot:
1. Click "Set enrollment triggers"
2. Select "Contact list membership"
3. List: ${config.triggerDetails || '[list name]'}
4. Condition: is member of
` : config.triggerType === 'deal' ? `
In HubSpot:
1. Click "Set enrollment triggers" 
2. Select "Deal stage"
3. Deal stage: ${config.triggerDetails || '[stage name]'}
4. Pipeline: ${config.workflowName?.includes('Sales') ? 'Sales Pipeline' : 'Default'}
` : `
In HubSpot:
1. Click "Set enrollment triggers"
2. Select "Date property"
3. Property: ${config.triggerDetails || '[date field]'}
4. Timing: Before/After/On date
`}

### 3. BUILD THE SEQUENCE

${config.workflowType === 'lead-nurture' ? `
**LEAD NURTURE SEQUENCE (${config.sequenceLength} steps)**

📧 **Email 1: Welcome/Value** (Immediate)
- Send marketing email: "Welcome to [Company]"
- Content: Introduce yourself, set expectations, provide quick value
- CTA: Educational resource

⏱️ **Delay: 3 ${config.delayType}**

${config.includeScoring ? `📊 **Lead Score Update**
- If opened Email 1: +5 points
- If clicked: +10 points
` : ''}

📧 **Email 2: Education** (Day 3)
- Send: "Here's how [solution] works"
- Content: Problem → Solution framework
- CTA: Case study or demo video

⏱️ **Delay: 4 ${config.delayType}**

${config.includeBranching ? `🔀 **IF/THEN BRANCH: Engagement Check**
- IF contact clicked any email in sequence
  - Continue to Email 3 (engaged path)
- ELSE
  - Send re-engagement email
  - Delay 3 days
  - If still no engagement → Remove from workflow
` : ''}

📧 **Email 3: Social Proof** (Day 7)
- Send: "How [Customer] achieved [Result]"
- Content: Mini case study with metrics
- CTA: Talk to sales / Book demo

⏱️ **Delay: 5 ${config.delayType}**

📧 **Email 4: Overcome Objections** (Day 12)
- Send: "Common questions about [Product]"
- Content: FAQ style, address concerns
- CTA: Free trial / Consultation

⏱️ **Delay: 3 ${config.delayType}**

📧 **Email 5: Final Push** (Day 15)
- Send: "Ready to [achieve outcome]?"
- Content: Urgency, clear next step
- CTA: Strong demo/trial CTA

${config.includeInternal ? `
👤 **Internal Notification**
- IF contact clicked Email 5 CTA
- Send internal email to: Sales team
- Subject: "Hot lead: [Contact name] from [Company]"
- Include: All engagement data
` : ''}
` : config.workflowType === 'onboarding' ? `
**CUSTOMER ONBOARDING SEQUENCE**

📧 **Email 1: Welcome** (Immediate)
- Send: "Welcome to [Product]! Here's how to get started"
- Content: Account setup steps, key resources
- CTA: Complete profile / First action

⏱️ **Delay: 1 ${config.delayType}**

✅ **Task: Check activation**
- Create task for CSM: "Check if [Contact] completed setup"

📧 **Email 2: First Win** (Day 1)
- Send: "Complete your first [key action]"
- Content: Step-by-step guide to first success
- CTA: Try now

⏱️ **Delay: 3 ${config.delayType}**

${config.includeBranching ? `🔀 **IF/THEN BRANCH: Activation Check**
- IF contact property "First action completed" = Yes
  - Send advanced tips email
- ELSE
  - Send help offer email
  - Create task for CSM outreach
` : ''}

📧 **Email 3: Feature Highlight** (Day 4)
- Send: "Have you tried [Feature]?"
- Content: Feature benefit + how-to
- CTA: Use feature

📧 **Email 4: Check-in** (Day 7)
- Send: "How's it going with [Product]?"
- Content: Resources, support options
- CTA: Book success call

📧 **Email 5: Success Story** (Day 14)
- Send: "You're on track! Here's what's next"
- Content: Celebrate progress, introduce advanced features
- CTA: Explore more
` : config.workflowType === 'reengagement' ? `
**RE-ENGAGEMENT SEQUENCE**

📧 **Email 1: We Miss You** (Immediate)
- Send: "It's been a while, [First name]"
- Content: Acknowledge absence, remind of value
- CTA: Come back with incentive

⏱️ **Delay: 4 ${config.delayType}**

📧 **Email 2: What's New** (Day 4)
- Send: "Here's what you've missed"
- Content: New features, improvements
- CTA: See what's new

⏱️ **Delay: 5 ${config.delayType}**

${config.includeBranching ? `🔀 **IF/THEN BRANCH: Response Check**
- IF any engagement
  - Move to active nurture
- ELSE
  - Continue to Email 3
` : ''}

📧 **Email 3: Feedback Request** (Day 9)
- Send: "Quick question for you"
- Content: Why did you leave? Survey
- CTA: Take 30-sec survey

📧 **Email 4: Last Chance** (Day 14)
- Send: "Is this goodbye?"
- Content: Final value reminder, easy re-entry
- CTA: Stay connected / Unsubscribe option

${config.includeInternal ? `
👤 **Final Action**
- IF no engagement after sequence
- Update property: "Lead status" = "Churned"
- Remove from marketing lists
` : ''}
` : `
**UPSELL/CROSS-SELL SEQUENCE**

📧 **Email 1: Value Check** (Immediate)
- Send: "Getting value from [Current product]?"
- Content: Recap their success, set up expansion
- CTA: Share feedback

⏱️ **Delay: 3 ${config.delayType}**

📧 **Email 2: Introduce Expansion** (Day 3)
- Send: "Take [Product] to the next level"
- Content: Introduce upgrade/add-on benefit
- CTA: Learn more

⏱️ **Delay: 5 ${config.delayType}**

📧 **Email 3: Case Study** (Day 8)
- Send: "How [Customer] expanded with us"
- Content: Expansion success story
- CTA: Talk to success team

${config.includeBranching ? `🔀 **IF/THEN BRANCH: Interest Signal**
- IF clicked expansion content
  - Create deal in upgrade pipeline
  - Notify account owner
  - Send pricing info
- ELSE
  - Continue nurture
` : ''}

📧 **Email 4: Offer** (Day 12)
- Send: "Special offer for valued customers"
- Content: Time-limited upgrade incentive
- CTA: Claim offer
`}

### 4. ENROLLMENT SETTINGS
- ✅ Re-enrollment: ${config.workflowType === 'lead-nurture' ? 'No (once per contact)' : 'Yes, when trigger met again'}
- ✅ Unenrollment: When goal achieved
- ✅ Suppression: Exclude unsubscribed contacts

### 5. REVIEW & ACTIVATE
1. Click "Review" to check for errors
2. Test with internal contact first
3. Click "Turn on" to activate

---

## CRM ACTIONS TO ADD
${config.crmActions.map(a => `- ${a}`).join('\n')}

## PERFORMANCE METRICS TO TRACK
- Enrollment rate
- Email open rates (benchmark: 20-25%)
- Click rates (benchmark: 2-5%)
- Goal completion rate
- Time to goal
`;
    setPrompt(p);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">HubSpot Workflow Ride</div>
            <div className="text-xs text-gray-400">CRM automation & sequences</div>
          </div>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 capitalize">
          {config.workflowType.replace('-', ' ')}
        </Badge>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-amber-500 text-white' : i < step ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-amber-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Workflow Type</h2>
            <div className="space-y-2">
              {WORKFLOW_TYPES.map(w => (
                <button key={w.id} onClick={() => update('workflowType', w.id)} className={`w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 ${config.workflowType === w.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <w.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="font-semibold">{w.label}</div>
                    <div className="text-sm text-gray-400">{w.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <FormInput label="Workflow Name (optional)" value={config.workflowName} onChange={e => update('workflowName', e.target.value)} placeholder="e.g., Q1 Lead Nurture" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Enrollment Trigger</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trigger Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TRIGGERS.map(t => (
                  <button key={t.id} onClick={() => update('triggerType', t.id)} className={`p-3 rounded-lg border-2 text-center ${config.triggerType === t.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <span className="font-medium text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <FormInput label="Trigger Details" value={config.triggerDetails} onChange={e => update('triggerDetails', e.target.value)} placeholder={config.triggerType === 'form' ? 'Form name...' : config.triggerType === 'pageview' ? 'Page URL...' : 'Details...'} />
            <FormInput label="Target Audience" value={config.targetAudience} onChange={e => update('targetAudience', e.target.value)} placeholder="e.g., Marketing qualified leads in SaaS" />
            <FormInput label="Goal" value={config.goal} onChange={e => update('goal', e.target.value)} placeholder="e.g., Book a demo, Upgrade to paid" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Workflow Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sequence Length</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map(n => (
                  <button key={n} onClick={() => update('sequenceLength', n)} className={`flex-1 py-2 rounded-lg border ${config.sequenceLength === n ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 text-gray-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includeBranching} onChange={e => update('includeBranching', e.target.checked)} className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Include IF/THEN branching</div>
                  <div className="text-xs text-gray-400">Add conditional logic based on engagement</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includeScoring} onChange={e => update('includeScoring', e.target.checked)} className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Include lead scoring</div>
                  <div className="text-xs text-gray-400">Update scores based on engagement</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includeInternal} onChange={e => update('includeInternal', e.target.checked)} className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Include internal notifications</div>
                  <div className="text-xs text-gray-400">Alert team on key actions</div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">CRM Actions</label>
              <div className="flex flex-wrap gap-1.5">
                {CRM_ACTIONS.map(a => (
                  <Chip key={a} selected={config.crmActions.includes(a)} onClick={() => toggle('crmActions', a)}>{a}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate Workflow Guide</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Type</div>
                <div className="font-medium capitalize">{config.workflowType.replace('-', ' ')}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Steps</div>
                <div className="font-medium">{config.sequenceLength} emails</div>
              </div>
            </div>

            <button onClick={generatePrompt} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate HubSpot Workflow Guide
            </button>

            {prompt && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Workflow Guide</span>
                  <button onClick={copyPrompt} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm flex items-center gap-1.5">
                    {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
                <pre className="text-xs text-gray-400 overflow-auto max-h-80 whitespace-pre-wrap font-mono bg-black/50 p-4 rounded-lg border border-white/10">{prompt}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className={`px-5 py-2.5 rounded-lg font-medium ${step === 0 ? 'text-gray-600' : 'text-gray-300 hover:bg-white/10'}`}>
          ← Back
        </button>
        {step < steps.length - 1 && (
          <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-medium">
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

export default HubSpotWorkflowRide;