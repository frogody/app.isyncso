import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { 
  Sparkles, Loader2, Copy, Check, Play, Pause, RotateCcw, 
  Building2, Target, Users, Database, Wand2, Shield, Rocket,
  TrendingUp, UserPlus, Wallet, Handshake, Zap, FolderPlus, 
  ListPlus, BarChart3, Filter, FileText, Send
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-2.5 py-1 rounded text-xs transition-all ${selected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'}`}>
    {children}
  </button>
);

const OptionCard = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`p-3 rounded-lg border-2 text-left w-full transition-all ${selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}>
    {children}
  </button>
);

const FormInput = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" />
  </div>
);

const ClayCampaignBuilder = () => {
  const AI_MODELS = {
    'gpt-4.1-nano': { name: 'GPT 4.1 Nano', credits: 0.5, bestFor: 'Classification' },
    'gpt-5-nano': { name: 'GPT 5 Nano', credits: 0.5, bestFor: 'Lightweight reasoning' },
    'gpt-4o-mini': { name: 'GPT 4o Mini', credits: 1, bestFor: 'Fast tasks' },
    'gpt-4.1-mini': { name: 'GPT 4.1 Mini', credits: 1, bestFor: 'Larger context' },
    'gpt-5-mini': { name: 'GPT 5 Mini', credits: 1, bestFor: 'Balanced' },
    'claude-3-haiku': { name: 'Claude 3 Haiku', credits: 1, bestFor: 'Quick text' },
    'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', credits: 1, bestFor: 'Multi-modal' },
    'claude-3.5-haiku': { name: 'Claude 3.5 Haiku', credits: 2, bestFor: 'Cost-effective' },
    'argon': { name: 'Argon', credits: 3, bestFor: 'Deep research', recommended: true },
    'gpt-4o': { name: 'GPT 4o', credits: 3, bestFor: 'Complex tasks' },
    'claude-4.5-haiku': { name: 'Claude 4.5 Haiku', credits: 3, bestFor: 'Better following' },
    'clay-navigator': { name: 'Clay Navigator', credits: 6, bestFor: 'Browser actions' },
    'gpt-5': { name: 'GPT 5', credits: 8, bestFor: 'Advanced reasoning' },
    'gpt-4.1': { name: 'GPT 4.1', credits: 12, bestFor: 'Best instruction following' },
    'o3': { name: 'o3', credits: 15, bestFor: 'Deep analysis' },
    'claude-4-sonnet': { name: 'Claude 4 Sonnet', credits: 15, bestFor: 'Exceptional reasoning' },
  };

  const EMAIL_PROVIDERS = [
    { id: 'icypeas', name: 'Icypeas', credits: 0.5, note: 'Cheapest' },
    { id: 'leadmagic', name: 'LeadMagic', credits: 1, note: 'Good accuracy' },
    { id: 'kitt', name: 'Kitt', credits: 1, note: 'Fast' },
    { id: 'enrow', name: 'Enrow', credits: 1, note: 'Built-in validation' },
    { id: 'dropcontact', name: 'Dropcontact', credits: 2, note: 'GDPR compliant' },
    { id: 'findymail', name: 'Findymail', credits: 2, note: 'High accuracy' },
    { id: 'datagma', name: 'Datagma', credits: 2, note: 'European data' },
    { id: 'smarte', name: 'SMARTe', credits: 6, note: 'Premium' },
  ];

  const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
  
  const SENIORITY_LEVELS = [
    { id: 'c-suite', label: 'C-Suite', titles: ['CEO', 'CTO', 'CFO', 'COO', 'CMO'] },
    { id: 'vp', label: 'VP', titles: ['VP', 'Vice President'] },
    { id: 'director', label: 'Director', titles: ['Director', 'Head of'] },
    { id: 'manager', label: 'Manager', titles: ['Manager'] },
  ];

  const JOB_FUNCTIONS = ['Sales', 'Marketing', 'Engineering', 'Product', 'HR', 'Finance', 'Operations', 'IT', 'Customer Success', 'Business Development'];

  const INDUSTRIES = ['Software Development', 'IT Services and IT Consulting', 'Financial Services', 'Marketing Services', 'Business Consulting and Services', 'Hospitals and Health Care', 'Manufacturing', 'Retail', 'Real Estate', 'Professional Services', 'Staffing and Recruiting', 'Insurance', 'Telecommunications', 'Legal Services', 'Investment Management', 'Technology, Information and Internet', 'Banking', 'E-Learning Providers', 'Advertising Services', 'Human Resources Services'];

  const REGIONS = [
    { id: 'netherlands', label: 'Netherlands' },
    { id: 'germany', label: 'Germany' },
    { id: 'uk', label: 'United Kingdom' },
    { id: 'us', label: 'United States' },
    { id: 'emea', label: 'EMEA' },
    { id: 'nam', label: 'North America' },
    { id: 'apac', label: 'APAC' },
    { id: 'global', label: 'Global' },
  ];

  const EXPORT_DESTINATIONS = [
    { id: 'csv', name: 'CSV', desc: '24hr expiry' },
    { id: 'hubspot', name: 'HubSpot', desc: 'CRM' },
    { id: 'salesforce', name: 'Salesforce', desc: 'CRM' },
    { id: 'instantly', name: 'Instantly', desc: 'Cold email' },
    { id: 'smartlead', name: 'Smartlead', desc: 'AI outreach' },
    { id: 'sheets', name: 'Google Sheets', desc: 'Live sync' },
  ];

  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestionCopied, setSuggestionCopied] = useState(false);
  
  // Phase-based execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseResults, setPhaseResults] = useState([]);
  const [executionError, setExecutionError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const PHASES = [
    { id: 1, name: 'Create Workbook', icon: FolderPlus, estimatedTime: '~1 min' },
    { id: 2, name: 'Build List', icon: ListPlus, estimatedTime: '~2 min' },
    { id: 3, name: 'Add Enrichments', icon: BarChart3, estimatedTime: '~3 min' },
    { id: 4, name: 'Apply Filters', icon: Filter, estimatedTime: '~1 min' },
    { id: 5, name: 'AI Personalization', icon: Sparkles, estimatedTime: '~3 min' },
    { id: 6, name: 'Test & Export', icon: Send, estimatedTime: '~2 min' },
  ];

  const getActivePhases = () => {
    const phases = [1, 2, 3, 4];
    if (config.useAI) phases.push(5);
    phases.push(6);
    return phases;
  };

  const generatePhasePrompt = (phase) => {
    const waterfall = getWaterfall();
    
    switch(phase) {
      case 1:
        return `Create Clay workbook: "${config.companyName || 'My'} - ${config.campaignGoal || 'Outreach'} Campaign"
Then enable Sandbox Mode (toolbar button at top of table).
Reply "Phase 1 complete" when done.`;

      case 2:
        return `In Clay, go to Find People (Home → Find people). Apply these filters:
${config.targetIndustries.length ? `- Industries: ${config.targetIndustries.join(', ')}` : ''}
${config.targetCompanySizes.length ? `- Company size: ${config.targetCompanySizes.join(', ')} employees` : ''}
${config.targetSeniority.length ? `- Seniority: ${config.targetSeniority.map(s => SENIORITY_LEVELS.find(l => l.id === s)?.label).join(', ')}` : ''}
${config.targetFunctions.length ? `- Job functions: ${config.targetFunctions.join(', ')}` : ''}
${config.targetRegions.length ? `- Location: ${config.targetRegions.map(r => REGIONS.find(x => x.id === r)?.label).join(', ')}` : ''}
${config.targetTitles ? `- Titles containing: ${config.targetTitles}` : ''}
Target ~${config.listSize} results. Click Continue to add to table.
Reply "Phase 2 complete" when done.`;

      case 3:
        let enrichmentPrompt = `Add enrichment columns. IMPORTANT: For EACH column you add, click column header → Run settings → Toggle OFF "Auto-update".

`;
        if (config.needEmail) {
          enrichmentPrompt += `EMAIL WATERFALL:
+ Add column → Waterfall → Email
Add providers in order: ${waterfall.map(p => p.name).join(', ')}
Set "Only run if" condition: !{{Work_Email}}

`;
        }
        if (config.needLinkedIn) {
          enrichmentPrompt += `LINKEDIN:
+ Add column → Enrichment → "LinkedIn lookup (name+company)"
Map: /First Name, /Last Name, /Company Name
Set "Only run if": !{{LinkedIn_URL}}

`;
        }
        if (config.needPhone) {
          enrichmentPrompt += `PHONE (expensive - 13 credits):
+ Add column → Enrichment → "Mobile Phone"  
Set "Only run if": {{Email}} != ""

`;
        }
        if (config.needCompanyData) {
          enrichmentPrompt += `COMPANY DATA:
+ Add column → Enrichment → Company profile
Map: /Company Name or /Company Domain

`;
        }
        enrichmentPrompt += `Reply "Phase 3 complete" when done.`;
        return enrichmentPrompt;

      case 4:
        return `Add filters to the table (Toolbar → Filters):
- Email is not empty
${config.targetSeniority.length ? `- Job_Title contains any of: ${config.targetSeniority.map(s => SENIORITY_LEVELS.find(l => l.id === s)?.titles?.join(', ')).join(', ')}` : ''}
Save this filtered view as "ICP Qualified" (Views dropdown → Save view).
Reply "Phase 4 complete" when done.`;

      case 5:
        if (!config.useAI) return null;
        
        if (config.personalizationType === 'standard' || config.personalizationType === 'deep') {
          return `Add AI personalization columns. Disable Auto-update on each.

RESEARCH COLUMN:
+ Add column → Use AI → Web research (Claygent)
Model: Argon (3 credits, best for research)
Prompt: Research /Company Name. Return: 1) Main product/service 2) Recent news 3) Target customers

OPENING LINE COLUMN:
+ Add column → Use AI → Generate text  
Model: Claude 3 Haiku (1 credit, fast)
Prompt: Write ${config.toneOfVoice} opening for /First Name, /Job Title at /Company Name.
Context: /Company_Research
We are ${config.companyName}: ${config.whatYouDo || '[what we do]'}
Goal: ${config.messageGoal || 'book a meeting'}
Under 20 words, no fluff.

Reply "Phase 5 complete" when done.`;
        } else {
          return `Add AI column for basic personalization. Disable Auto-update.

+ Add column → Use AI → Generate text
Model: Claude 3 Haiku (1 credit)
Prompt: Write short ${config.toneOfVoice} opener for /First Name at /Company Name.
We are ${config.companyName}: ${config.whatYouDo || '[what we do]'}
Under 15 words.

Reply "Phase 5 complete" when done.`;
        }

      case 6:
        return `Final steps - test and export:
1. Select 5 test rows (click checkboxes)
2. Right-click → Run enrichments on selected rows
3. Wait for completion, verify output quality
4. If results look good: Select all filtered rows → Run enrichments on all
5. Once complete: Actions → Exports → ${EXPORT_DESTINATIONS.find(d => d.id === config.exportDestination)?.name || 'CSV'}
6. Map fields and execute export

Reply "Campaign complete!" when finished.`;

      default:
        return null;
    }
  };

  const executeWorkflow = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setPhaseResults([]);
    setCurrentPhase(0);
    
    const activePhases = getActivePhases();
    const results = [];
    
    for (let i = 0; i < activePhases.length; i++) {
      if (isPaused) {
        // Wait until unpaused
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused) {
              clearInterval(checkPause);
              resolve();
            }
          }, 500);
        });
      }
      
      const phase = activePhases[i];
      setCurrentPhase(phase);
      
      const phasePrompt = generatePhasePrompt(phase);
      if (!phasePrompt) continue;
      
      results.push({
        phase,
        name: PHASES.find(p => p.id === phase)?.name,
        prompt: phasePrompt,
        status: 'pending'
      });
      setPhaseResults([...results]);
      
      // Mark current as running
      results[results.length - 1].status = 'running';
      setPhaseResults([...results]);
      
      // Small delay to let UI update
      await new Promise(r => setTimeout(r, 500));
      
      // Mark as complete
      results[results.length - 1].status = 'complete';
      setPhaseResults([...results]);
    }
    
    setIsExecuting(false);
    setCurrentPhase(0);
  };

  const copyPhasePrompt = (phasePrompt) => {
    navigator.clipboard.writeText(phasePrompt);
  };

  const getAiSuggestion = async (type) => {
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const result = await base44.functions.invoke('generateClaySuggestions', { config, suggestionType: type });
      setAiSuggestion(result.data);
    } catch (err) {
      console.error("AI suggestion error:", err);
      setAiSuggestion({ suggestion: "Failed to get suggestion. Please try again.", type });
    }
    setAiLoading(false);
  };

  const copySuggestion = () => {
    if (aiSuggestion?.suggestion) {
      navigator.clipboard.writeText(aiSuggestion.suggestion);
      setSuggestionCopied(true);
      setTimeout(() => setSuggestionCopied(false), 2000);
    }
  };

  const [config, setConfig] = useState({
    companyName: '',
    companyWebsite: '',
    whatYouDo: '',
    industry: '',
    valueProposition: '',
    campaignGoal: '',
    campaignDescription: '',
    targetIndustries: [],
    targetCompanySizes: [],
    targetSeniority: [],
    targetFunctions: [],
    targetTitles: '',
    targetRegions: [],
    dataSource: 'find-people',
    listSize: 500,
    needEmail: true,
    needPhone: false,
    needLinkedIn: true,
    needCompanyData: false,
    gdprMode: false,
    budgetLevel: 'balanced',
    useAI: true,
    personalizationType: 'standard',
    toneOfVoice: 'professional',
    messageGoal: '',
    exportDestination: 'csv',
    sandboxMode: true,
  });

  const steps = [
    { title: 'Company', icon: Building2 },
    { title: 'Goal', icon: Target },
    { title: 'Audience', icon: Users },
    { title: 'Data', icon: Database },
    { title: 'AI', icon: Wand2 },
    { title: 'Output', icon: Shield },
    { title: 'Generate', icon: Rocket },
  ];

  const update = (k, v) => setConfig(p => ({ ...p, [k]: v }));
  const toggle = (k, item) => setConfig(p => ({ ...p, [k]: p[k].includes(item) ? p[k].filter(i => i !== item) : [...p[k], item] }));

  const calcCredits = () => {
    let perRow = 0;
    const breakdown = [];
    if (config.needEmail) { const c = config.budgetLevel === 'minimal' ? 1.5 : config.budgetLevel === 'premium' ? 3.5 : 2.5; perRow += c; breakdown.push({ item: 'Email', cost: c }); }
    if (config.needPhone) { perRow += 13; breakdown.push({ item: 'Phone', cost: 13 }); }
    if (config.needLinkedIn) { perRow += 1; breakdown.push({ item: 'LinkedIn', cost: 1 }); }
    if (config.needCompanyData) { perRow += 13; breakdown.push({ item: 'Company', cost: 13 }); }
    if (config.useAI) { const c = config.personalizationType === 'deep' ? 12 : config.personalizationType === 'standard' ? 4 : 1; perRow += c; breakdown.push({ item: 'AI', cost: c }); }
    return { perRow: Math.round(perRow * 10) / 10, total: Math.round(perRow * config.listSize), breakdown };
  };

  const getWaterfall = () => {
    let ids = config.gdprMode 
      ? ['dropcontact', 'datagma', 'icypeas', 'leadmagic'] 
      : ['icypeas', 'leadmagic', 'kitt'];
    
    if (config.budgetLevel !== 'minimal') {
      if (!ids.includes('dropcontact')) ids.push('dropcontact');
      if (!ids.includes('findymail')) ids.push('findymail');
    }
    if (config.budgetLevel === 'premium') {
      if (!ids.includes('smarte')) ids.push('smarte');
    }
    
    return ids.map(id => EMAIL_PROVIDERS.find(p => p.id === id)).filter(Boolean);
  };

  const generate = () => {
    const credits = calcCredits();
    const waterfall = getWaterfall();
    
    const p = `# CLAY CAMPAIGN AUTOMATION

> **Company:** ${config.companyName || '[COMPANY]'}
> **Goal:** ${config.campaignGoal || '[GOAL]'}
> **Prospects:** ${config.listSize}
> **Est. Credits:** ${credits.total.toLocaleString()} (~${credits.perRow}/row)

---

## SANDBOX MODE - CRITICAL

${config.sandboxMode ? `**ENABLED - Build without burning credits**

1. **Enable Sandbox Mode** in toolbar (top of table)
2. **For EVERY column:** Click header → Run settings → Toggle OFF "Auto-update"
3. **Build entire workflow first** before running anything
4. **Test safely:** Select 5 rows → Right-click → Run enrichments
5. **Only when ready:** Disable Sandbox Mode and run on all
` : `Tips: Enable Sandbox Mode, disable Auto-update, test on 5 rows first`}

---

## COMPANY CONTEXT

| Field | Value |
|-------|-------|
| Company | ${config.companyName || '[NAME]'} |
| Website | ${config.companyWebsite || '[URL]'} |
| What we do | ${config.whatYouDo || '[DESCRIPTION]'} |
| Value prop | ${config.valueProposition || '[VALUE]'} |

---

## PHASE 1: CREATE WORKBOOK

1. **Home → "+ New" → "Workbook"**
2. Name: "${config.companyName || 'My'} - ${config.campaignGoal || 'Outreach'} Campaign"
${config.sandboxMode ? '3. **Enable Sandbox Mode immediately**' : ''}

---

## PHASE 2: BUILD LIST

${config.dataSource === 'find-people' ? `### Find People

1. **Home → "Find people"**
2. Filters:
   ${config.targetIndustries.length ? `- Industries: ${config.targetIndustries.join(', ')}` : '- Industries: [SELECT]'}
   ${config.targetCompanySizes.length ? `- Size: ${config.targetCompanySizes.join(', ')}` : '- Size: [SELECT]'}
   ${config.targetSeniority.length ? `- Seniority: ${config.targetSeniority.map(s => SENIORITY_LEVELS.find(l => l.id === s)?.label).join(', ')}` : '- Seniority: [SELECT]'}
   ${config.targetFunctions.length ? `- Functions: ${config.targetFunctions.join(', ')}` : ''}
   ${config.targetTitles ? `- Titles: ${config.targetTitles}` : ''}
   ${config.targetRegions.length ? `- Location: ${config.targetRegions.map(r => REGIONS.find(x => x.id === r)?.label).join(', ')}` : ''}
3. Verify ~${config.listSize} results → **Continue**

**Limits:** Max 50,000 records, 100 per company` : `### Import ${config.dataSource === 'csv' ? 'CSV' : 'CRM'}

1. **Home → Import**
2. Upload/connect and map fields
3. Import`}

---

## PHASE 3: ENRICH

${config.sandboxMode ? '**⚠️ Disable "Auto-update" for each column!**\n' : ''}
${config.needEmail ? `### Email Waterfall

1. **"+ Add column" → "Waterfall" → Email**
2. Providers:
${waterfall.map((p, i) => `   ${i + 1}. **${p.name}** (${p.credits} cr)`).join('\n')}
3. **"Only run if"** → \`!{{Work_Email}}\`
` : ''}
${config.needLinkedIn ? `### LinkedIn (1 cr)
**"+ Add column" → Enrichment → "LinkedIn lookup"**
Map: /First Name, /Last Name, /Company Name
` : ''}
${config.needPhone ? `### Phone (13 cr - expensive!)
**"Only run if"** → \`{{Email}} != ""\`
` : ''}

---

## PHASE 4: FILTER

1. **Toolbar → Filters**
2. Add: Email is not empty
3. **Save view:** "ICP Qualified"

---

${config.useAI ? `## PHASE 5: AI

### Variables: Type \`/\` → select column

${config.personalizationType === 'standard' ? `**Research (Argon - 3 cr)**
\`\`\`
Research /Company Name:
1. Main product/service
2. Recent news
3. Target customer
\`\`\`

**Opening Line (Claude 3 Haiku - 1 cr)**
\`\`\`
Opening for /First Name, /Job Title at /Company Name.
Company info: /Company_Research
Our company: ${config.companyName} - ${config.whatYouDo || '[what we do]'}
${config.toneOfVoice} tone. Under 20 words.
\`\`\`
` : `**Personalization**
\`\`\`
Write for /First Name at /Company Name.
Our company: ${config.companyName} - ${config.whatYouDo || '[what we do]'}
Goal: ${config.messageGoal || '[action]'}
\`\`\`
`}

**Test:** Select 5 rows → Run → Review

---

` : ''}## PHASE ${config.useAI ? '6' : '5'}: EXPORT

### ${EXPORT_DESTINATIONS.find(d => d.id === config.exportDestination)?.name || 'CSV'}
1. Apply filters
2. **Actions → Exports**
3. Map and execute

---

## CREDITS

| Item | /Row | Total |
|------|------|-------|
${credits.breakdown.map(b => `| ${b.item} | ${b.cost} | ${Math.round(b.cost * config.listSize).toLocaleString()} |`).join('\n')}
| **Total** | **${credits.perRow}** | **${credits.total.toLocaleString()}** |

---

## AI MODELS

| Model | Credits | Use |
|-------|---------|-----|
| GPT 4.1 Nano | 0.5 | Cheapest |
| Claude 3 Haiku | 1 | Quick text |
| **Argon** | **3** | **Research** |
| GPT 4o | 3 | Complex |
| GPT 4.1 | 12 | Best |
| o3 | 15 | Deep |

---

## REMINDERS

1. **Sandbox Mode** - Build first
2. **Filter before enriching**
3. **Test 5 rows** first
4. **"Only run if"** saves credits
`;
    setPrompt(p);
  };

  const credits = calcCredits();

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-white">Clay Campaign Builder</div>
            <div className="text-xs text-gray-400">Personalized outreach automation</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Est. Credits</div>
          <div className="font-bold text-indigo-400">{credits.total.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto mb-4">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap ${i === step ? 'bg-indigo-500 text-white' : i < step ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500 border border-white/10'}`}
            >
              <s.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-3 h-0.5 flex-shrink-0 ${i < step ? 'bg-indigo-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4">
        
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">About Your Company</h2>
            <p className="text-gray-400 text-sm">Context for AI personalization</p>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Company Name *" value={config.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Inc" />
              <FormInput label="Website" value={config.companyWebsite} onChange={e => update('companyWebsite', e.target.value)} placeholder="https://acme.com" />
            </div>
            <FormInput label="What do you do? *" value={config.whatYouDo} onChange={e => update('whatYouDo', e.target.value)} placeholder="We help B2B companies automate sales outreach" />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Industry</label>
              <select value={config.industry} onChange={e => update('industry', e.target.value)} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white">
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Value Proposition</label>
              <textarea value={config.valueProposition} onChange={e => update('valueProposition', e.target.value)} placeholder="We reduce prospecting time by 80%..." rows={2} className="w-full px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Campaign Goal</h2>
            <div className="space-y-2">
              {[
                { id: 'sales', name: 'Sales Prospecting', icon: TrendingUp },
                { id: 'recruiting', name: 'Recruiting', icon: UserPlus },
                { id: 'investors', name: 'Investor Outreach', icon: Wallet },
                { id: 'partnerships', name: 'Partnerships', icon: Handshake },
                { id: 'other', name: 'Other', icon: Zap },
              ].map(g => (
                <OptionCard key={g.id} selected={config.campaignGoal === g.id} onClick={() => update('campaignGoal', g.id)}>
                  <div className="flex items-center gap-3">
                    <g.icon className="w-6 h-6 text-indigo-400" />
                    <span className="font-medium">{g.name}</span>
                  </div>
                </OptionCard>
              ))}
            </div>
            {config.campaignGoal === 'other' && (
              <FormInput label="Describe" value={config.campaignDescription} onChange={e => update('campaignDescription', e.target.value)} placeholder="Your goal..." />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Target Audience (ICP)</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Industries</label>
              <div className="flex flex-wrap gap-1.5">{INDUSTRIES.map(i => <Chip key={i} selected={config.targetIndustries.includes(i)} onClick={() => toggle('targetIndustries', i)}>{i}</Chip>)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
              <div className="flex flex-wrap gap-1.5">{COMPANY_SIZES.map(s => <Chip key={s} selected={config.targetCompanySizes.includes(s)} onClick={() => toggle('targetCompanySizes', s)}>{s}</Chip>)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Seniority</label>
              <div className="flex flex-wrap gap-1.5">{SENIORITY_LEVELS.map(l => <Chip key={l.id} selected={config.targetSeniority.includes(l.id)} onClick={() => toggle('targetSeniority', l.id)}>{l.label}</Chip>)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Functions</label>
              <div className="flex flex-wrap gap-1.5">{JOB_FUNCTIONS.map(f => <Chip key={f} selected={config.targetFunctions.includes(f)} onClick={() => toggle('targetFunctions', f)}>{f}</Chip>)}</div>
            </div>
            <FormInput label="Specific Titles" value={config.targetTitles} onChange={e => update('targetTitles', e.target.value)} placeholder="CEO, CTO, VP Sales..." />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Regions</label>
              <div className="flex flex-wrap gap-1.5">{REGIONS.map(r => <Chip key={r.id} selected={config.targetRegions.includes(r.id)} onClick={() => toggle('targetRegions', r.id)}>{r.label}</Chip>)}</div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => getAiSuggestion('improveICP')}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Thinking...' : 'Get AI ICP Suggestions'}
              </button>
              {aiSuggestion?.type === 'improveICP' && (
                <div className="mt-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <div className="text-xs text-indigo-400 mb-2">AI Suggestion</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{aiSuggestion.suggestion}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Data & Enrichment</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'find-people', name: 'Find People' }, { id: 'csv', name: 'Import CSV' }, { id: 'crm', name: 'Import CRM' }].map(s => (
                  <OptionCard key={s.id} selected={config.dataSource === s.id} onClick={() => update('dataSource', s.id)}>
                    <span className="font-medium text-sm">{s.name}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
            <FormInput label="List Size" type="number" value={config.listSize} onChange={e => update('listSize', parseInt(e.target.value) || 100)} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data to Collect</label>
              <div className="space-y-1.5">
                {[
                  { k: 'needEmail', n: 'Email', c: '~2.5/row' },
                  { k: 'needLinkedIn', n: 'LinkedIn', c: '1/row' },
                  { k: 'needPhone', n: 'Phone', c: '13/row' },
                  { k: 'needCompanyData', n: 'Company Data', c: '13/row' },
                ].map(d => (
                  <label key={d.k} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${config[d.k] ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={config[d.k]} onChange={e => update(d.k, e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-sm">{d.n}</span>
                    </div>
                    <span className="text-xs text-gray-500">{d.c}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Budget</label>
              <div className="grid grid-cols-3 gap-2">
                {['minimal', 'balanced', 'premium'].map(b => (
                  <OptionCard key={b} selected={config.budgetLevel === b} onClick={() => update('budgetLevel', b)}>
                    <span className="text-sm capitalize">{b}</span>
                  </OptionCard>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
              <input type="checkbox" checked={config.gdprMode} onChange={e => update('gdprMode', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">GDPR Mode (EU)</span>
            </label>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => getAiSuggestion('optimizeCredits')}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Thinking...' : 'Optimize Credit Usage'}
              </button>
              {aiSuggestion?.type === 'optimizeCredits' && (
                <div className="mt-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <div className="text-xs text-indigo-400 mb-2">AI Suggestion</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{aiSuggestion.suggestion}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">AI Personalization</h2>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer">
              <input type="checkbox" checked={config.useAI} onChange={e => update('useAI', e.target.checked)} className="w-5 h-5" />
              <div>
                <div className="font-medium">Enable AI</div>
                <div className="text-sm text-gray-400">Generate custom content</div>
              </div>
            </label>
            {config.useAI && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Depth</label>
                  {[
                    { id: 'basic', n: 'Basic', d: 'Opening line', c: '~1 cr' },
                    { id: 'standard', n: 'Standard', d: 'Research + line', c: '~4 cr' },
                    { id: 'deep', n: 'Deep', d: 'Full research', c: '~12 cr' },
                  ].map(l => (
                    <OptionCard key={l.id} selected={config.personalizationType === l.id} onClick={() => update('personalizationType', l.id)}>
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium text-sm">{l.n}</div>
                          <div className="text-xs text-gray-400">{l.d}</div>
                        </div>
                        <span className="text-xs text-indigo-400">{l.c}</span>
                      </div>
                    </OptionCard>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['professional', 'casual', 'formal'].map(t => (
                      <OptionCard key={t} selected={config.toneOfVoice === t} onClick={() => update('toneOfVoice', t)}>
                        <span className="text-sm capitalize">{t}</span>
                      </OptionCard>
                    ))}
                  </div>
                </div>
                <FormInput label="Desired Action" value={config.messageGoal} onChange={e => update('messageGoal', e.target.value)} placeholder="Book demo, reply..." />
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => getAiSuggestion('improvePrompt')}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-indigo-500/10 to-indigo-500/5 border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? 'Thinking...' : 'Generate Better AI Prompt'}
                  </button>
                  {aiSuggestion?.type === 'improvePrompt' && (
                    <div className="mt-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs text-indigo-400">AI Generated Prompt</div>
                        <button 
                          onClick={copySuggestion}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-500 hover:bg-indigo-400 rounded transition-colors"
                        >
                          {suggestionCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {suggestionCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-black/50 p-3 rounded">{aiSuggestion.suggestion}</pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Output & Safety</h2>
            <div className="p-4 bg-indigo-500/10 border-2 border-indigo-500/50 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={config.sandboxMode} onChange={e => update('sandboxMode', e.target.checked)} className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold text-indigo-400 flex items-center gap-2"><Shield className="w-4 h-4" /> Sandbox Mode <span className="text-xs bg-indigo-500/20 px-1.5 py-0.5 rounded">RECOMMENDED</span></div>
                  <div className="text-sm text-gray-300 mt-1">Build without spending credits</div>
                </div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Export To</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPORT_DESTINATIONS.map(d => (
                  <OptionCard key={d.id} selected={config.exportDestination === d.id} onClick={() => update('exportDestination', d.id)}>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.desc}</div>
                  </OptionCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Generate & Execute</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Company</div>
                <div className="font-medium">{config.companyName || 'Not set'}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Goal</div>
                <div className="font-medium capitalize">{config.campaignGoal || 'Not set'}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">List Size</div>
                <div className="font-medium">{config.listSize.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400">Sandbox</div>
                <div className="font-medium flex items-center gap-1">{config.sandboxMode ? <><Shield className="w-4 h-4 text-indigo-400" /> On</> : 'Off'}</div>
              </div>
            </div>
            
            {/* Credits Estimate */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Est. Credits</span>
                <span className="text-2xl font-bold text-indigo-400">{credits.total.toLocaleString()}</span>
              </div>
              {credits.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between text-sm text-slate-300">
                  <span>{b.item}</span>
                  <span>{Math.round(b.cost * config.listSize).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Phase-Based Execution Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">Phase-Based Execution</h3>
                  <p className="text-xs text-gray-400">~10-15 min total (vs 50 min single prompt)</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded flex items-center gap-1"><Zap className="w-3 h-3" /> 3x Faster</span>
                </div>
              </div>

              {/* Progress Bar */}
              {isExecuting && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Phase {currentPhase} of {getActivePhases().length}</span>
                    <span>{Math.round((phaseResults.filter(r => r.status === 'complete').length / getActivePhases().length) * 100)}%</span>
                  </div>
                  <Progress value={(phaseResults.filter(r => r.status === 'complete').length / getActivePhases().length) * 100} className="h-2" />
                </div>
              )}

              {/* Phase List */}
              <div className="space-y-2 mb-4">
                {getActivePhases().map((phaseId, idx) => {
                  const phase = PHASES.find(p => p.id === phaseId);
                  const result = phaseResults.find(r => r.phase === phaseId);
                  const isCurrentPhase = currentPhase === phaseId;
                  
                  return (
                    <div 
                      key={phaseId}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        result?.status === 'complete' ? 'border-green-500/50 bg-green-500/10' :
                        result?.status === 'running' ? 'border-indigo-500/50 bg-indigo-500/10 animate-pulse' :
                        'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {phase?.icon && <phase.icon className="w-5 h-5 text-indigo-400" />}
                        <div>
                          <div className="font-medium text-sm">{phase?.name}</div>
                          <div className="text-xs text-gray-500">{phase?.estimatedTime}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result?.status === 'complete' && <Check className="w-4 h-4 text-green-400" />}
                        {result?.status === 'running' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                        {result?.prompt && (
                          <button 
                            onClick={() => copyPhasePrompt(result.prompt)}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                            title="Copy phase prompt"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Execution Controls */}
              <div className="flex gap-2">
                {!isExecuting ? (
                  <button 
                    onClick={executeWorkflow}
                    className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Generate All Phase Prompts
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsPaused(!isPaused)}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      onClick={() => { setIsExecuting(false); setPhaseResults([]); setCurrentPhase(0); }}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {executionError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {executionError}
                </div>
              )}
            </div>

            {/* Individual Phase Prompts (Expandable) */}
            {phaseResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Generated Prompts (copy & paste into Claude)</h4>
                {phaseResults.map((result, idx) => (
                  <details key={idx} className="bg-white/5 rounded-lg border border-white/10">
                    <summary className="p-3 cursor-pointer flex items-center justify-between">
                      <span className="font-medium text-sm">Phase {result.phase}: {result.name}</span>
                      <button 
                        onClick={(e) => { e.preventDefault(); copyPhasePrompt(result.prompt); }}
                        className="px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-xs"
                      >
                        Copy
                      </button>
                    </summary>
                    <pre className="p-3 text-xs text-gray-400 whitespace-pre-wrap font-mono border-t border-white/10 max-h-48 overflow-auto">
                      {result.prompt}
                    </pre>
                  </details>
                ))}
              </div>
            )}

            {/* Legacy: Full Prompt Option */}
            <details className="bg-white/5 rounded-lg border border-white/10">
              <summary className="p-3 cursor-pointer text-sm text-gray-400">
                Generate legacy single prompt (slower execution)
              </summary>
              <div className="p-3 border-t border-white/10">
                <button onClick={generate} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/10">
                  Generate Full Prompt
                </button>
                {prompt && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Full Prompt</span>
                      <button onClick={() => { navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white rounded text-xs flex items-center gap-1">
                        {copied ? <><Check className="w-3 h-3" /> Copied</> : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-auto max-h-60 whitespace-pre-wrap font-mono bg-black/50 p-3 rounded">{prompt}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>

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

export default ClayCampaignBuilder;