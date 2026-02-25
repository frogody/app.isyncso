import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Building2, Rocket, TrendingUp, Crown, RefreshCw, Lock } from 'lucide-react';
import { INDUSTRIES, getSubcategories } from './IndustryData';

const COMPANY_STAGES = [
  { value: 'startup', label: 'Startup', icon: Rocket, desc: 'Early stage, finding product-market fit' },
  { value: 'growing', label: 'Growing', icon: TrendingUp, desc: 'Scaling operations and team' },
  { value: 'established', label: 'Established', icon: Building2, desc: 'Mature business with stable revenue' },
  { value: 'rebrand', label: 'Rebrand', icon: RefreshCw, desc: 'Existing brand getting a refresh' },
];

export default function BusinessIdentity({ data, onChange }) {
  const [industrySearch, setIndustrySearch] = useState('');
  const [showIndustryList, setShowIndustryList] = useState(false);

  const filteredIndustries = useMemo(() => {
    if (!industrySearch.trim()) return INDUSTRIES;
    const q = industrySearch.toLowerCase();
    return INDUSTRIES.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.subcategories.some(s => s.toLowerCase().includes(q))
    );
  }, [industrySearch]);

  const subcategories = useMemo(
    () => getSubcategories(data.industry?.primary),
    [data.industry?.primary]
  );

  const handleIndustrySelect = (name) => {
    onChange({
      industry: { ...data.industry, primary: name, sub: '' },
    });
    setShowIndustryList(false);
    setIndustrySearch('');
  };

  const handleSubcategorySelect = (sub) => {
    onChange({
      industry: { ...data.industry, sub },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Business Identity</h2>
        <p className="text-sm text-zinc-400">Tell us about your company to build the foundation of your brand.</p>
      </div>

      {/* Path toggle */}
      <div className="flex gap-2">
        <button className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
          Start from Scratch
        </button>
        <button
          disabled
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-zinc-800/40 border border-zinc-700/40 text-zinc-600 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          Import Existing
          <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full">Soon</span>
        </button>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Company Name <span className="text-red-400">*</span>
        </label>
        <Input
          value={data.company_name}
          onChange={(e) => onChange({ company_name: e.target.value.slice(0, 100) })}
          placeholder="e.g. Acme Corp"
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl"
          maxLength={100}
        />
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Tagline</label>
        <Input
          value={data.tagline || ''}
          onChange={(e) => onChange({ tagline: e.target.value.slice(0, 150) || null })}
          placeholder="e.g. Building the future of work"
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl"
          maxLength={150}
        />
        <p className="text-xs text-zinc-600">Optional — we can generate one for you later.</p>
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Industry <span className="text-red-400">*</span>
        </label>

        {data.industry?.primary && !showIndustryList ? (
          <button
            onClick={() => setShowIndustryList(true)}
            className="w-full text-left px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/60 text-white hover:border-yellow-400/30 transition-colors"
          >
            <span className="text-sm">{data.industry.primary}</span>
          </button>
        ) : (
          <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/60 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/40">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                placeholder="Search industries..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filteredIndustries.map((industry) => (
                <button
                  key={industry.name}
                  onClick={() => handleIndustrySelect(industry.name)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.04] transition-colors ${
                    data.industry?.primary === industry.name
                      ? 'text-yellow-400 bg-yellow-400/5'
                      : 'text-zinc-300'
                  }`}
                >
                  {industry.name}
                </button>
              ))}
              {filteredIndustries.length === 0 && (
                <div className="px-4 py-6 text-sm text-zinc-600 text-center">No industries match your search</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subcategory */}
      {data.industry?.primary && subcategories.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Subcategory</label>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubcategorySelect(sub)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  data.industry?.sub === sub
                    ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400'
                    : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Company Stage */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">
          Company Stage <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {COMPANY_STAGES.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => onChange({ company_stage: value })}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                data.company_stage === value
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-white'
                  : 'bg-zinc-800/30 border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${data.company_stage === value ? 'text-yellow-400' : 'text-zinc-500'}`} />
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
