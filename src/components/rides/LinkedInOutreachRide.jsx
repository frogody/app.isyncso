import React, { useState } from 'react';
import { 
  Briefcase, User, Target, MessageSquare, Sparkles, Copy, Check,
  Building2, ArrowRight, Loader2, Users, Send
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/api/supabaseClient';

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
  </div>
);

const LinkedInOutreachRide = () => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [config, setConfig] = useState({
    yourName: '',
    yourTitle: '',
    yourCompany: '',
    whatYouDo: '',
    targetRole: '',
    targetIndustry: '',
    targetCompanySize: [],
    connectionReason: '',
    outreachGoal: 'network',
    tone: 'professional',
    includeFollowUp: true,
    messageType: 'connection',
    personalizationLevel: 'standard'
  });

  const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
  const GOALS = [
    { id: 'network', label: 'Build Network', icon: Users },
    { id: 'meeting', label: 'Book Meeting', icon: MessageSquare },
    { id: 'partnership', label: 'Partnership', icon: Building2 },
    { id: 'hiring', label: 'Recruiting', icon: User }
  ];
  const TONES = ['professional', 'casual', 'friendly', 'direct'];

  const steps = [
    { title: 'You', icon: User },
    { title: 'Target', icon: Target },
    { title: 'Message', icon: MessageSquare },
    { title: 'Generate', icon: Sparkles }
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const generatePrompt = () => {
    const p = `# LINKEDIN ${config.messageType === 'inmail' ? 'INMAIL' : 'CONNECTION REQUEST'} GENERATOR

## YOUR CONTEXT
- Name: ${config.yourName || '[Your Name]'}
- Title: ${config.yourTitle || '[Your Title]'}
- Company: ${config.yourCompany || '[Your Company]'}
- What you do: ${config.whatYouDo || '[What you do]'}

## TARGET PROFILE
- Role: ${config.targetRole || '[Target Role]'}
- Industry: ${config.targetIndustry || '[Target Industry]'}
${config.targetCompanySize.length ? `- Company Size: ${config.targetCompanySize.join(', ')} employees` : ''}

## MESSAGE REQUIREMENTS
- Goal: ${GOALS.find(g => g.id === config.outreachGoal)?.label || 'Networking'}
- Tone: ${config.tone}
- Personalization: ${config.personalizationLevel}
${config.connectionReason ? `- Connection Reason: ${config.connectionReason}` : ''}

---

## TASK

Generate a ${config.messageType === 'inmail' ? 'LinkedIn InMail (up to 1900 chars)' : 'LinkedIn connection request (max 300 chars)'} that:

1. ${config.personalizationLevel === 'deep' ? 'References something SPECIFIC from their profile/posts/company' : 'Has a personalized opening hook'}
2. ${config.outreachGoal === 'meeting' ? 'Includes a clear but soft CTA for a call' : 'Builds genuine connection without being pushy'}
3. Uses ${config.tone} tone throughout
4. Feels human, not templated
5. ${config.messageType === 'connection' ? 'Fits in 300 characters including spaces' : 'Is concise but valuable'}

${config.personalizationLevel === 'deep' ? `
## RESEARCH FIRST
Before writing, search for:
- Their recent LinkedIn posts
- Their company's latest news
- Their career trajectory
- Mutual connections or interests

Use ONE specific finding in your opening.
` : ''}

${config.includeFollowUp ? `
## FOLLOW-UP SEQUENCE
Also generate:
1. **If no response (3 days)**: Brief bump message
2. **If connected but no reply (5 days)**: Value-add message
3. **Final attempt (7 days)**: Graceful close
` : ''}

## OUTPUT FORMAT
\`\`\`
[MAIN MESSAGE]
Your message here...

${config.includeFollowUp ? `[FOLLOW-UP 1 - Day 3]
...

[FOLLOW-UP 2 - Day 5]
...

[FOLLOW-UP 3 - Day 7]
...` : ''}
\`\`\`

## REMEMBER
- No "I hope this finds you well"
- No "I came across your profile"
- No "I'd love to pick your brain"
- Be specific, not generic
- Lead with value, not asks
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">LinkedIn Outreach Ride</div>
            <div className="text-xs text-gray-400">Personalized connection & InMail generator</div>
          </div>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          {config.messageType === 'inmail' ? 'InMail' : 'Connection'}
        </Badge>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-blue-500 text-white' : i < step ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}
            >
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-blue-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">About You</h2>
            <p className="text-gray-400 text-sm">This context helps personalize your outreach</p>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Your Name" value={config.yourName} onChange={e => update('yourName', e.target.value)} placeholder="John Smith" />
              <FormInput label="Your Title" value={config.yourTitle} onChange={e => update('yourTitle', e.target.value)} placeholder="Sales Director" />
            </div>
            <FormInput label="Your Company" value={config.yourCompany} onChange={e => update('yourCompany', e.target.value)} placeholder="Acme Inc" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">What do you do? (value prop)</label>
              <textarea value={config.whatYouDo} onChange={e => update('whatYouDo', e.target.value)} placeholder="We help B2B companies increase outbound response rates by 3x..." rows={2} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Target Profile</h2>
            <p className="text-gray-400 text-sm">Who are you reaching out to?</p>
            <FormInput label="Target Role/Title" value={config.targetRole} onChange={e => update('targetRole', e.target.value)} placeholder="VP of Sales, Head of Growth..." />
            <FormInput label="Target Industry" value={config.targetIndustry} onChange={e => update('targetIndustry', e.target.value)} placeholder="SaaS, Fintech, Healthcare..." />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
              <div className="flex flex-wrap gap-1.5">
                {COMPANY_SIZES.map(s => (
                  <Chip key={s} selected={config.targetCompanySize.includes(s)} onClick={() => toggle('targetCompanySize', s)}>{s}</Chip>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Why connect? (optional)</label>
              <textarea value={config.connectionReason} onChange={e => update('connectionReason', e.target.value)} placeholder="Mutual connection, same industry event, their recent post..." rows={2} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Message Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'connection', label: 'Connection Request', desc: '300 chars max' }, { id: 'inmail', label: 'InMail', desc: '1900 chars' }].map(t => (
                  <button key={t.id} onClick={() => update('messageType', t.id)} className={`p-3 rounded-lg border-2 text-left ${config.messageType === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-gray-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => update('outreachGoal', g.id)} className={`p-3 rounded-lg border-2 text-left flex items-center gap-2 ${config.outreachGoal === g.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <g.icon className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-sm">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map(t => (
                  <Chip key={t} selected={config.tone === t} onClick={() => update('tone', t)}>{t}</Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Personalization Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'basic', label: 'Basic', desc: 'Template-based' }, { id: 'standard', label: 'Standard', desc: 'Profile-aware' }, { id: 'deep', label: 'Deep', desc: 'Research-first' }].map(l => (
                  <button key={l.id} onClick={() => update('personalizationLevel', l.id)} className={`p-3 rounded-lg border-2 text-center ${config.personalizationLevel === l.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <div className="font-medium text-sm">{l.label}</div>
                    <div className="text-xs text-gray-400">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
              <input type="checkbox" checked={config.includeFollowUp} onChange={e => update('includeFollowUp', e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="font-medium text-sm">Include Follow-up Sequence</div>
                <div className="text-xs text-gray-400">Generate 3 follow-up messages</div>
              </div>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate Prompt</h2>
            
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Message Type</div>
                <div className="font-medium capitalize">{config.messageType}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Goal</div>
                <div className="font-medium">{GOALS.find(g => g.id === config.outreachGoal)?.label}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Target</div>
                <div className="font-medium truncate">{config.targetRole || 'Not set'}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Personalization</div>
                <div className="font-medium capitalize">{config.personalizationLevel}</div>
              </div>
            </div>

            <button onClick={generatePrompt} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Prompt
            </button>

            {prompt && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Prompt</span>
                  <button onClick={copyPrompt} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm flex items-center gap-1.5">
                    {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                </div>
                <pre className="text-xs text-gray-400 overflow-auto max-h-80 whitespace-pre-wrap font-mono bg-black/50 p-4 rounded-lg border border-white/10">{prompt}</pre>
                <p className="text-xs text-gray-500 mt-2">Paste this into Claude with the target's LinkedIn profile URL</p>
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
          <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium">
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

export default LinkedInOutreachRide;