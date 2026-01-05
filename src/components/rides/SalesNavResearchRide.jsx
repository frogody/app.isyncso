import React, { useState } from 'react';
import { 
  Search, User, Building2, Target, Sparkles, Copy, Check,
  Filter, Database, FileText, TrendingUp, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none" />
  </div>
);

const SalesNavResearchRide = () => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    researchType: 'prospect',
    companyName: '',
    prospectName: '',
    prospectTitle: '',
    industry: '',
    yourProduct: '',
    painPoints: [],
    researchDepth: 'standard',
    outputFormat: 'summary',
    includeCompetitors: true,
    includeTriggers: true,
    includeOrgChart: false
  });

  const PAIN_POINTS = [
    'Cost reduction', 'Revenue growth', 'Efficiency', 'Compliance',
    'Tech modernization', 'Talent', 'Customer retention', 'Scale'
  ];

  const RESEARCH_TYPES = [
    { id: 'prospect', label: 'Individual Prospect', icon: User, desc: 'Deep dive on a person' },
    { id: 'company', label: 'Company Research', icon: Building2, desc: 'Full account analysis' },
    { id: 'icp', label: 'ICP Definition', icon: Target, desc: 'Build ideal profile' }
  ];

  const steps = [
    { title: 'Type', icon: Search },
    { title: 'Target', icon: Target },
    { title: 'Context', icon: Database },
    { title: 'Generate', icon: Sparkles }
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const generatePrompt = () => {
    let p = '';
    
    if (config.researchType === 'prospect') {
      p = `# PROSPECT RESEARCH DEEP DIVE

## TARGET
- Name: ${config.prospectName || '[Prospect Name]'}
- Title: ${config.prospectTitle || '[Title]'}
- Company: ${config.companyName || '[Company]'}

## RESEARCH TASK

I need comprehensive intelligence on this prospect. Using Sales Navigator and LinkedIn:

### 1. PROFESSIONAL PROFILE
- Current role scope and responsibilities
- Career trajectory (last 3 positions)
- Time in current role
- Reporting structure (who they report to)
- Team size if applicable
- Key achievements mentioned

### 2. ENGAGEMENT SIGNALS
- Recent LinkedIn activity (posts, comments, shares)
- Topics they engage with
- Content they create
- Groups they're in
- Connections in common
- Recent job changes in their network

### 3. COMPANY CONTEXT
- Company's recent news/announcements
- Funding/financial status
- Growth trajectory
- Tech stack (if visible)
- Recent hires in their department

${config.includeTriggers ? `### 4. BUYING TRIGGERS
Look for signals like:
- New executive hires
- Expansion news
- Pain point mentions
- Tech evaluation posts
- Budget cycle timing
- Strategic initiatives mentioned
` : ''}

${config.includeOrgChart ? `### 5. ORG MAPPING
- Key stakeholders in buying process
- Economic buyer
- Technical evaluator
- Champion potential
- Potential blockers
` : ''}

## OUTPUT FORMAT: ${config.outputFormat === 'battlecard' ? 'Battlecard' : config.outputFormat === 'brief' ? '1-page Brief' : 'Executive Summary'}

${config.outputFormat === 'battlecard' ? `
Create a sales battlecard with:
- Prospect snapshot (3 bullets)
- Company snapshot (3 bullets)  
- Conversation starters (3 specific)
- Potential pain points
- Objection predictions
- Recommended approach
` : config.outputFormat === 'brief' ? `
Create a 1-page brief with:
- Executive summary (2 sentences)
- Key findings (5 bullets)
- Engagement strategy
- Talking points
- Next steps
` : `
Create an executive summary with:
- TL;DR (1 paragraph)
- Key insights
- Recommended action
`}

## MY CONTEXT
- Product/Service: ${config.yourProduct || '[What I sell]'}
${config.painPoints.length ? `- Relevant pain points: ${config.painPoints.join(', ')}` : ''}

Focus research on angles relevant to my offering.`;
    } else if (config.researchType === 'company') {
      p = `# COMPANY ACCOUNT RESEARCH

## TARGET COMPANY
- Name: ${config.companyName || '[Company Name]'}
- Industry: ${config.industry || '[Industry]'}

## RESEARCH TASK

Conduct comprehensive account research using Sales Navigator, LinkedIn, and web sources:

### 1. COMPANY OVERVIEW
- Business model
- Products/services
- Target market
- Value proposition
- Competitive positioning

### 2. FINANCIAL HEALTH
- Funding history
- Revenue estimates
- Growth rate
- Recent financial news
- Investment activity

### 3. ORGANIZATIONAL INTELLIGENCE
- Leadership team
- Recent exec changes
- Department structure
- Hiring patterns
- Team growth/contraction

### 4. STRATEGIC INITIATIVES
- Recent announcements
- Product launches
- Partnerships
- Acquisitions
- Market expansion

${config.includeCompetitors ? `### 5. COMPETITIVE LANDSCAPE
- Main competitors
- Market position
- Competitive advantages
- Weaknesses vs competition
- Win/loss patterns
` : ''}

### 6. TECHNOLOGY STACK
- Known technologies
- Recent tech investments
- Integration needs
- Modernization signals

### 7. BUYING SIGNALS
- Pain points (public mentions)
- RFPs/evaluations
- Budget cycles
- Decision timelines
- Previous vendors

## OUTPUT FORMAT
Create a comprehensive account plan with:
1. Account snapshot (1 paragraph)
2. Key stakeholders to target (5-10 people with roles)
3. Entry strategy recommendation
4. Potential objections
5. Competitive positioning
6. Timeline estimate

## MY CONTEXT
- Product/Service: ${config.yourProduct || '[What I sell]'}
${config.painPoints.length ? `- Pain points I solve: ${config.painPoints.join(', ')}` : ''}`;
    } else {
      p = `# ICP DEFINITION & VALIDATION

## CONTEXT
- My Product: ${config.yourProduct || '[What I sell]'}
- Current Industry Focus: ${config.industry || '[Industry]'}
${config.painPoints.length ? `- Pain Points I Solve: ${config.painPoints.join(', ')}` : ''}

## TASK

Help me define and validate my Ideal Customer Profile using Sales Navigator data:

### 1. FIRMOGRAPHIC CRITERIA
Analyze successful B2B companies in my space and identify:
- Optimal company size (employees)
- Revenue range
- Industry verticals
- Geographic focus
- Business model type
- Growth stage

### 2. TECHNOGRAPHIC SIGNALS
What technology indicators suggest fit:
- Current tech stack patterns
- Integration needs
- Technology maturity
- Digital transformation stage

### 3. BEHAVIORAL INDICATORS
Signals that indicate buying readiness:
- Hiring patterns
- Content engagement
- Event participation
- Vendor evaluation signals

### 4. BUYER PERSONAS
For each target company, who are the:
- Economic buyers (titles, seniority)
- Technical evaluators
- End users
- Champions
- Blockers

### 5. NEGATIVE INDICATORS
What signals suggest poor fit:
- Company characteristics to avoid
- Red flag behaviors
- Disqualifying factors

## OUTPUT FORMAT
Create an ICP document with:
1. ICP Summary (1 paragraph definition)
2. Must-have criteria (deal breakers)
3. Nice-to-have criteria (ideal but flexible)
4. Negative criteria (disqualifiers)
5. Sample target companies (10 examples)
6. Sales Navigator search filters to use
7. Outreach messaging themes`;
    }
    
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">Sales Navigator Research Ride</div>
            <div className="text-xs text-gray-400">Deep prospect & account intelligence</div>
          </div>
        </div>
        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 capitalize">
          {config.researchType}
        </Badge>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-indigo-500 text-white' : i < step ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-indigo-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Research Type</h2>
            <p className="text-gray-400 text-sm">What kind of research do you need?</p>
            <div className="space-y-2">
              {RESEARCH_TYPES.map(t => (
                <button key={t.id} onClick={() => update('researchType', t.id)} className={`w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 ${config.researchType === t.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <t.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-sm text-gray-400">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Target Details</h2>
            {config.researchType === 'prospect' && (
              <>
                <FormInput label="Prospect Name" value={config.prospectName} onChange={e => update('prospectName', e.target.value)} placeholder="Jane Smith" />
                <FormInput label="Title/Role" value={config.prospectTitle} onChange={e => update('prospectTitle', e.target.value)} placeholder="VP of Sales" />
                <FormInput label="Company" value={config.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Inc" />
              </>
            )}
            {config.researchType === 'company' && (
              <>
                <FormInput label="Company Name" value={config.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Inc" />
                <FormInput label="Industry" value={config.industry} onChange={e => update('industry', e.target.value)} placeholder="SaaS, Fintech..." />
              </>
            )}
            {config.researchType === 'icp' && (
              <>
                <FormInput label="Target Industry" value={config.industry} onChange={e => update('industry', e.target.value)} placeholder="B2B SaaS, Healthcare..." />
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Research Context</h2>
            <FormInput label="Your Product/Service" value={config.yourProduct} onChange={e => update('yourProduct', e.target.value)} placeholder="What do you sell?" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pain Points You Solve</label>
              <div className="flex flex-wrap gap-1.5">
                {PAIN_POINTS.map(p => (
                  <Chip key={p} selected={config.painPoints.includes(p)} onClick={() => toggle('painPoints', p)}>{p}</Chip>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Output Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'summary', label: 'Summary' }, { id: 'brief', label: '1-Page Brief' }, { id: 'battlecard', label: 'Battlecard' }].map(f => (
                  <button key={f.id} onClick={() => update('outputFormat', f.id)} className={`p-3 rounded-lg border-2 text-center ${config.outputFormat === f.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <span className="font-medium text-sm">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {config.researchType === 'prospect' && (
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.includeTriggers} onChange={e => update('includeTriggers', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Include buying triggers analysis</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.includeOrgChart} onChange={e => update('includeOrgChart', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Include org mapping</span>
                </label>
              </div>
            )}
            {config.researchType === 'company' && (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                <input type="checkbox" checked={config.includeCompetitors} onChange={e => update('includeCompetitors', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Include competitive analysis</span>
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate Prompt</h2>
            <button onClick={generatePrompt} className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Research Prompt
            </button>
            {prompt && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Prompt</span>
                  <button onClick={copyPrompt} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm flex items-center gap-1.5">
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
          <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-medium">
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

export default SalesNavResearchRide;