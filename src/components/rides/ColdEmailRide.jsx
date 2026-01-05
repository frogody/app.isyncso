import React, { useState } from 'react';
import { 
  Mail, User, Building2, Target, Sparkles, Copy, Check,
  MessageSquare, Zap, Clock, ArrowRight, Send
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none" />
  </div>
);

const ColdEmailRide = () => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    senderName: '',
    senderTitle: '',
    companyName: '',
    whatYouDo: '',
    uniqueValue: '',
    targetRole: '',
    targetIndustry: '',
    painPoints: [],
    cta: 'meeting',
    tone: 'professional',
    sequenceLength: 4,
    daysBetween: 3,
    includeSubjectLines: true,
    includePS: true,
    framework: 'aida'
  });

  const PAIN_POINTS = [
    'Time savings', 'Cost reduction', 'Revenue growth', 'Efficiency',
    'Compliance', 'Risk reduction', 'Competitive edge', 'Scaling'
  ];

  const CTA_OPTIONS = [
    { id: 'meeting', label: 'Book Meeting' },
    { id: 'reply', label: 'Get Reply' },
    { id: 'demo', label: 'Demo Request' },
    { id: 'resource', label: 'Share Resource' }
  ];

  const FRAMEWORKS = [
    { id: 'aida', label: 'AIDA', desc: 'Attention → Interest → Desire → Action' },
    { id: 'pas', label: 'PAS', desc: 'Problem → Agitate → Solution' },
    { id: 'bas', label: 'BAS', desc: 'Before → After → Bridge' },
    { id: 'quest', label: 'QUEST', desc: 'Qualify → Understand → Educate → Stimulate → Transition' }
  ];

  const TONES = ['professional', 'casual', 'direct', 'friendly', 'provocative'];

  const steps = [
    { title: 'Sender', icon: User },
    { title: 'Target', icon: Target },
    { title: 'Sequence', icon: Mail },
    { title: 'Generate', icon: Sparkles }
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const generatePrompt = () => {
    const frameworkGuide = {
      aida: `AIDA Framework:
- Attention: Hook with pattern interrupt or personalization
- Interest: Connect to their world/challenges  
- Desire: Show transformation possible
- Action: Clear, low-friction CTA`,
      pas: `PAS Framework:
- Problem: Name specific pain they likely have
- Agitate: Amplify the cost of inaction
- Solution: Position your offering as the answer`,
      bas: `Before/After/Bridge Framework:
- Before: Their current painful state
- After: The ideal state they want
- Bridge: How you get them there`,
      quest: `QUEST Framework:
- Qualify: Confirm they're the right person
- Understand: Show you get their situation
- Educate: Share insight they don't have
- Stimulate: Create urgency/emotion
- Transition: Move to next step`
    };

    const p = `# COLD EMAIL SEQUENCE GENERATOR

## SENDER CONTEXT
- Name: ${config.senderName || '[Your Name]'}
- Title: ${config.senderTitle || '[Your Title]'}
- Company: ${config.companyName || '[Company]'}
- What we do: ${config.whatYouDo || '[Description]'}
- Unique value: ${config.uniqueValue || '[What makes you different]'}

## TARGET PROFILE
- Role: ${config.targetRole || '[Target Role]'}
- Industry: ${config.targetIndustry || '[Industry]'}
${config.painPoints.length ? `- Pain points: ${config.painPoints.join(', ')}` : ''}

## SEQUENCE SPECS
- Emails: ${config.sequenceLength}
- Days between: ${config.daysBetween}
- Goal: ${CTA_OPTIONS.find(c => c.id === config.cta)?.label}
- Tone: ${config.tone}

## COPYWRITING FRAMEWORK
${frameworkGuide[config.framework]}

---

## GENERATE ${config.sequenceLength}-EMAIL SEQUENCE

For each email, create:
${config.includeSubjectLines ? '1. **Subject Line** (max 50 chars, creates curiosity)' : ''}
2. **Email Body** (under 100 words)
${config.includePS ? '3. **P.S. Line** (reinforces CTA or adds value)' : ''}

### EMAIL 1 - Initial Outreach (Day 1)
Purpose: Pattern interrupt, establish relevance, soft CTA
- Most personalized
- Reference something specific about them
- End with question, not demand

### EMAIL 2 - Value Add (Day ${config.daysBetween + 1})
Purpose: Give before asking
- Share relevant insight, stat, or resource
- No ask, just value
- Build credibility

### EMAIL 3 - Social Proof (Day ${config.daysBetween * 2 + 1})
Purpose: Reduce risk perception
- Mini case study or result
- Similar company/role reference
- Restate the CTA

### EMAIL 4 - Breakup (Day ${config.daysBetween * 3 + 1})
Purpose: Create urgency through scarcity
- Acknowledge they're busy
- Final attempt frame
- Easy out + door open

${config.sequenceLength > 4 ? `### EMAIL 5+ - Bump/Re-engage
Purpose: Stay top of mind
- New angle or trigger
- Fresh value proposition` : ''}

## RULES
1. NO "I hope this finds you well"
2. NO "I wanted to reach out"
3. NO "Let me know if you have time"
4. NO walls of text
5. EVERY email under 100 words
6. ONE idea per email
7. Mobile-first formatting
8. Conversational, not corporate

## OUTPUT FORMAT
\`\`\`
=== EMAIL 1 ===
${config.includeSubjectLines ? 'Subject: [subject here]' : ''}

[email body here]

${config.includePS ? 'P.S. [post script here]' : ''}

---

=== EMAIL 2 ===
[continue...]
\`\`\`

## PERSONALIZATION PLACEHOLDERS
Use these for merge fields:
- {{first_name}} - Recipient's first name
- {{company}} - Their company
- {{title}} - Their title
- {{pain_point}} - Specific pain point
- {{trigger}} - Recent trigger event
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">Cold Email Sequence Ride</div>
            <div className="text-xs text-gray-400">Multi-step email campaign generator</div>
          </div>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          {config.sequenceLength} emails
        </Badge>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-green-500 text-white' : i < step ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-green-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Sender Context</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Your Name" value={config.senderName} onChange={e => update('senderName', e.target.value)} placeholder="Jane Smith" />
              <FormInput label="Your Title" value={config.senderTitle} onChange={e => update('senderTitle', e.target.value)} placeholder="Account Executive" />
            </div>
            <FormInput label="Company Name" value={config.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Inc" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">What do you do?</label>
              <textarea value={config.whatYouDo} onChange={e => update('whatYouDo', e.target.value)} placeholder="We help SaaS companies increase demo bookings by 40%..." rows={2} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>
            <FormInput label="Unique Value (differentiator)" value={config.uniqueValue} onChange={e => update('uniqueValue', e.target.value)} placeholder="Only solution that integrates with..." />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Target Profile</h2>
            <FormInput label="Target Role" value={config.targetRole} onChange={e => update('targetRole', e.target.value)} placeholder="VP of Sales, Head of Marketing..." />
            <FormInput label="Target Industry" value={config.targetIndustry} onChange={e => update('targetIndustry', e.target.value)} placeholder="SaaS, E-commerce, Healthcare..." />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pain Points You Address</label>
              <div className="flex flex-wrap gap-1.5">
                {PAIN_POINTS.map(p => (
                  <Chip key={p} selected={config.painPoints.includes(p)} onClick={() => toggle('painPoints', p)}>{p}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Sequence Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Copywriting Framework</label>
              <div className="space-y-2">
                {FRAMEWORKS.map(f => (
                  <button key={f.id} onClick={() => update('framework', f.id)} className={`w-full p-3 rounded-lg border-2 text-left ${config.framework === f.id ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-xs text-gray-400">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Emails in Sequence</label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => update('sequenceLength', n)} className={`flex-1 py-2 rounded-lg border ${config.sequenceLength === n ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-gray-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Days Between</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => update('daysBetween', n)} className={`flex-1 py-2 rounded-lg border ${config.daysBetween === n ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/10 text-gray-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Call to Action</label>
              <div className="grid grid-cols-2 gap-2">
                {CTA_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => update('cta', c.id)} className={`p-3 rounded-lg border-2 ${config.cta === c.id ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <span className="font-medium text-sm">{c.label}</span>
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

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includeSubjectLines} onChange={e => update('includeSubjectLines', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Include subject lines</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includePS} onChange={e => update('includePS', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Include P.S. lines</span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate Sequence</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Framework</div>
                <div className="font-medium uppercase">{config.framework}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Sequence</div>
                <div className="font-medium">{config.sequenceLength} emails over {config.sequenceLength * config.daysBetween} days</div>
              </div>
            </div>

            <button onClick={generatePrompt} className="w-full py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Email Sequence Prompt
            </button>

            {prompt && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Prompt</span>
                  <button onClick={copyPrompt} className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-sm flex items-center gap-1.5">
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
          <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white rounded-lg font-medium">
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

export default ColdEmailRide;