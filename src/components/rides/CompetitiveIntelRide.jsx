import React, { useState } from 'react';
import { 
  Target, Building2, Search, Sparkles, Copy, Check,
  TrendingUp, Shield, Users, Zap, FileText, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none" />
  </div>
);

const CompetitiveIntelRide = () => {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    yourCompany: '',
    yourProduct: '',
    yourStrengths: [],
    competitors: '',
    analysisType: 'battlecard',
    industry: '',
    targetBuyer: '',
    focusAreas: [],
    includeObjectionHandling: true,
    includeTalkTracks: true,
    includeWinLoss: true
  });

  const STRENGTHS = [
    'Price', 'Features', 'Support', 'Integration', 'Ease of use',
    'Security', 'Scalability', 'Customization', 'Speed', 'Brand'
  ];

  const FOCUS_AREAS = [
    'Product comparison', 'Pricing analysis', 'Market positioning',
    'Customer reviews', 'Feature gaps', 'Go-to-market', 'Leadership', 'Funding'
  ];

  const ANALYSIS_TYPES = [
    { id: 'battlecard', label: 'Sales Battlecard', icon: Shield, desc: 'Win against specific competitor' },
    { id: 'landscape', label: 'Market Landscape', icon: TrendingUp, desc: 'Full competitive overview' },
    { id: 'deepdive', label: 'Deep Dive', icon: Search, desc: 'Single competitor analysis' }
  ];

  const steps = [
    { title: 'You', icon: Building2 },
    { title: 'Competitors', icon: Target },
    { title: 'Focus', icon: Search },
    { title: 'Generate', icon: Sparkles }
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const generatePrompt = () => {
    let p = '';
    
    if (config.analysisType === 'battlecard') {
      p = `# COMPETITIVE BATTLECARD GENERATOR

## OUR COMPANY
- Company: ${config.yourCompany || '[Your Company]'}
- Product: ${config.yourProduct || '[Your Product]'}
- Industry: ${config.industry || '[Industry]'}
${config.yourStrengths.length ? `- Key Strengths: ${config.yourStrengths.join(', ')}` : ''}

## TARGET COMPETITOR(S)
${config.competitors || '[Competitor names]'}

## TARGET BUYER
${config.targetBuyer || '[Buyer persona]'}

---

## RESEARCH & CREATE BATTLECARD

### 1. COMPETITOR OVERVIEW
For each competitor, research and document:
- Company basics (HQ, size, funding, leadership)
- Core product/service offering
- Target market and ICP
- Pricing model and typical deal size
- Recent news and announcements

### 2. PRODUCT COMPARISON MATRIX
Create a feature comparison table:
| Feature | Us | Competitor |
|---------|-----|------------|
- Core features
- Integrations
- Security/compliance
- Scalability
- Support model

### 3. POSITIONING ANALYSIS
- Their messaging and value prop
- How they position against us
- Their ideal customer vs ours
- Market perception

### 4. STRENGTHS & WEAKNESSES
**Their Strengths (acknowledge these)**
- Where they genuinely win
- Customer love points
- Competitive advantages

**Their Weaknesses (exploit these)**
- Known pain points
- Customer complaints (G2, Capterra)
- Product gaps
- Support issues

### 5. WIN THEMES
Top 3 reasons customers choose us over them:
1. [Theme + supporting proof point]
2. [Theme + supporting proof point]
3. [Theme + supporting proof point]

${config.includeObjectionHandling ? `### 6. OBJECTION HANDLING
Common objections when competing against them:

**"[Competitor] has [feature X]"**
Response: [How to handle]

**"[Competitor] is cheaper"**
Response: [How to handle]

**"We already use [Competitor]"**
Response: [How to handle]

**"[Competitor] is the market leader"**
Response: [How to handle]
` : ''}

${config.includeTalkTracks ? `### 7. COMPETITIVE TALK TRACKS
**Opening (when competitor comes up)**
"I appreciate you being transparent about evaluating [Competitor]. Many of our customers evaluated them too. The main differences they found were..."

**Discovery questions to ask**
- "What specifically drew you to [Competitor]?"
- "Have you seen how they handle [our strength area]?"
- "What's most important in this decision?"

**Trap-setting questions**
- Questions that expose competitor weaknesses
- Questions that highlight our strengths
` : ''}

${config.includeWinLoss ? `### 8. WIN/LOSS PATTERNS
Based on available data:
- Typical win scenarios against them
- Common loss reasons
- Key decision factors
` : ''}

## OUTPUT FORMAT
Create a 1-page battlecard with:
1. Quick competitor snapshot (3 bullets)
2. Their positioning vs ours
3. Feature comparison (key 5-7 features)
4. Win themes (top 3)
5. Landmine questions (3 questions)
6. Objection responses (top 3)
7. Proof points to cite
`;
    } else if (config.analysisType === 'landscape') {
      p = `# COMPETITIVE LANDSCAPE ANALYSIS

## CONTEXT
- Our Company: ${config.yourCompany || '[Your Company]'}
- Our Product: ${config.yourProduct || '[Your Product]'}
- Industry: ${config.industry || '[Industry]'}
- Target Buyer: ${config.targetBuyer || '[Buyer]'}

## COMPETITORS TO ANALYZE
${config.competitors || '[List competitors]'}

---

## CREATE MARKET LANDSCAPE OVERVIEW

### 1. MARKET MAP
Create a 2x2 matrix positioning all players:
- Axis 1: [Suggest relevant axis, e.g., Enterprise vs SMB]
- Axis 2: [Suggest relevant axis, e.g., Feature depth vs Ease of use]

### 2. COMPETITOR PROFILES (for each)
- **Company**: Name, HQ, Founded, Employees, Funding
- **Product**: Core offering, key features
- **Target**: ICP, typical customer
- **Pricing**: Model, typical deal size
- **GTM**: Sales motion, channels
- **Traction**: Notable customers, growth signals

### 3. FEATURE LANDSCAPE
Create comparison matrix across all competitors:
${config.focusAreas.map(f => `- ${f}`).join('\n')}

### 4. PRICING COMPARISON
- Entry price points
- Enterprise pricing
- Pricing models (per seat, usage, flat)
- Discounting behavior

### 5. MARKET DYNAMICS
- Overall market size and growth
- Key trends affecting competition
- Emerging threats
- Consolidation activity

### 6. STRATEGIC RECOMMENDATIONS
Based on analysis:
- Where we should compete
- Where we should avoid
- Gaps we can exploit
- Threats to monitor

## OUTPUT FORMAT
Executive summary (1 page) + detailed appendix`;
    } else {
      p = `# COMPETITOR DEEP DIVE ANALYSIS

## CONTEXT
- Our Company: ${config.yourCompany || '[Your Company]'}
- Our Product: ${config.yourProduct || '[Your Product]'}
${config.yourStrengths.length ? `- Our Strengths: ${config.yourStrengths.join(', ')}` : ''}

## TARGET COMPETITOR
${config.competitors || '[Competitor name]'}

---

## COMPREHENSIVE COMPETITOR ANALYSIS

### 1. COMPANY INTELLIGENCE
- Full company history and trajectory
- Leadership team backgrounds
- Organizational structure
- Culture and values (from Glassdoor, LinkedIn)
- Office locations and remote policy

### 2. FINANCIAL ANALYSIS
- Funding history (all rounds, investors)
- Revenue estimates
- Growth rate
- Burn rate signals
- Path to profitability

### 3. PRODUCT DEEP DIVE
- Full feature inventory
- Product roadmap (if available)
- Technology stack
- Integration ecosystem
- API capabilities
- Security/compliance certs

### 4. GO-TO-MARKET ANALYSIS
- Sales motion (PLG, sales-led, hybrid)
- Sales team structure
- Marketing strategy
- Content themes
- Event presence
- Partnership strategy

### 5. CUSTOMER ANALYSIS
- Customer segments
- Notable logos
- Case studies analysis
- Review sentiment (G2, Capterra, TrustRadius)
- Churn signals
- NPS if available

### 6. STRENGTHS ANALYSIS
Where they genuinely excel:
- Product advantages
- Market advantages
- Team advantages
- Perception advantages

### 7. VULNERABILITY ANALYSIS  
Where they're weak:
- Product gaps
- Service issues
- Perception problems
- Organizational challenges
- Technical debt signals

### 8. STRATEGIC ASSESSMENT
- Their likely 12-month moves
- Threats they pose to us
- Opportunities for us
- Recommended counter-strategy

## OUTPUT FORMAT
Detailed report with executive summary`;
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/25">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">Competitive Intel Ride</div>
            <div className="text-xs text-gray-400">Battlecards & competitor analysis</div>
          </div>
        </div>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 capitalize">
          {config.analysisType}
        </Badge>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-red-500 text-white' : i < step ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-red-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your Company</h2>
            <FormInput label="Company Name" value={config.yourCompany} onChange={e => update('yourCompany', e.target.value)} placeholder="Acme Inc" />
            <FormInput label="Product/Service" value={config.yourProduct} onChange={e => update('yourProduct', e.target.value)} placeholder="Sales automation platform" />
            <FormInput label="Industry" value={config.industry} onChange={e => update('industry', e.target.value)} placeholder="B2B SaaS" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Key Strengths</label>
              <div className="flex flex-wrap gap-1.5">
                {STRENGTHS.map(s => (
                  <Chip key={s} selected={config.yourStrengths.includes(s)} onClick={() => toggle('yourStrengths', s)}>{s}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Competitors</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Analysis Type</label>
              <div className="space-y-2">
                {ANALYSIS_TYPES.map(t => (
                  <button key={t.id} onClick={() => update('analysisType', t.id)} className={`w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 ${config.analysisType === t.id ? 'border-red-500 bg-red-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <t.icon className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-sm text-gray-400">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Competitor(s) to Analyze</label>
              <textarea value={config.competitors} onChange={e => update('competitors', e.target.value)} placeholder={config.analysisType === 'landscape' ? "Competitor 1, Competitor 2, Competitor 3..." : "Enter competitor name"} rows={2} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>
            <FormInput label="Target Buyer Persona" value={config.targetBuyer} onChange={e => update('targetBuyer', e.target.value)} placeholder="VP of Sales at mid-market SaaS" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Analysis Focus</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Focus Areas</label>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_AREAS.map(f => (
                  <Chip key={f} selected={config.focusAreas.includes(f)} onClick={() => toggle('focusAreas', f)}>{f}</Chip>
                ))}
              </div>
            </div>
            
            {config.analysisType === 'battlecard' && (
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.includeObjectionHandling} onChange={e => update('includeObjectionHandling', e.target.checked)} className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">Include objection handling</div>
                    <div className="text-xs text-gray-400">How to respond to competitor mentions</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.includeTalkTracks} onChange={e => update('includeTalkTracks', e.target.checked)} className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">Include talk tracks</div>
                    <div className="text-xs text-gray-400">Competitive positioning scripts</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.includeWinLoss} onChange={e => update('includeWinLoss', e.target.checked)} className="w-4 h-4" />
                  <div>
                    <div className="font-medium text-sm">Include win/loss patterns</div>
                    <div className="text-xs text-gray-400">When we win vs lose against them</div>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate Analysis</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Analysis Type</div>
                <div className="font-medium capitalize">{config.analysisType}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Competitor(s)</div>
                <div className="font-medium truncate">{config.competitors || 'Not set'}</div>
              </div>
            </div>

            <button onClick={generatePrompt} className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all">
              <Sparkles className="w-5 h-5" />
              SYNC INTEL
            </button>

            {prompt && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Your Prompt</span>
                  <button onClick={copyPrompt} className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm flex items-center gap-1.5">
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
          <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium">
            Continue →
          </button>
        )}
      </div>
    </div>
  );
};

export default CompetitiveIntelRide;