import { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Building2, Rocket, TrendingUp, RefreshCw, Upload, Globe, Palette, Type, X, Plus } from 'lucide-react';
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
  const [entryPath, setEntryPath] = useState(data.existing_assets ? 'import' : 'scratch');
  const [colorInput, setColorInput] = useState('');
  const [fontInput, setFontInput] = useState('');
  const fileInputRef = useRef(null);

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

  // Import mode helpers
  const existingAssets = data.existing_assets || {
    logo_files: [],
    extracted_colors: [],
    extracted_fonts: [],
    extracted_url: null,
    brand_audit_gaps: [],
  };

  const updateAssets = (patch) => {
    onChange({
      existing_assets: { ...existingAssets, ...patch },
    });
  };

  const handlePathSwitch = (path) => {
    setEntryPath(path);
    if (path === 'scratch') {
      onChange({ existing_assets: null });
    } else {
      onChange({
        existing_assets: existingAssets,
        company_stage: 'rebrand',
      });
    }
  };

  const handleAddColor = () => {
    const hex = colorInput.trim().replace(/^(?!#)/, '#');
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    if (existingAssets.extracted_colors.includes(hex)) return;
    updateAssets({ extracted_colors: [...existingAssets.extracted_colors, hex] });
    setColorInput('');
  };

  const handleRemoveColor = (hex) => {
    updateAssets({ extracted_colors: existingAssets.extracted_colors.filter(c => c !== hex) });
  };

  const handleAddFont = () => {
    const font = fontInput.trim();
    if (!font || existingAssets.extracted_fonts.includes(font)) return;
    updateAssets({ extracted_fonts: [...existingAssets.extracted_fonts, font] });
    setFontInput('');
  };

  const handleRemoveFont = (font) => {
    updateAssets({ extracted_fonts: existingAssets.extracted_fonts.filter(f => f !== font) });
  };

  const handleLogoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const names = files.map(f => f.name);
    updateAssets({ logo_files: [...existingAssets.logo_files, ...names] });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Business Identity</h2>
        <p className="text-sm text-zinc-400">Tell us about your company to build the foundation of your brand.</p>
      </div>

      {/* Path toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handlePathSwitch('scratch')}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            entryPath === 'scratch'
              ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
              : 'bg-zinc-800/40 border border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          Start from Scratch
        </button>
        <button
          onClick={() => handlePathSwitch('import')}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            entryPath === 'import'
              ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
              : 'bg-zinc-800/40 border border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Import Existing
        </button>
      </div>

      {/* Import Existing section */}
      {entryPath === 'import' && (
        <div className="space-y-6 rounded-xl bg-zinc-900/40 border border-zinc-700/30 p-5">
          <p className="text-xs text-zinc-500">Enter your existing brand details. These will seed the color, typography, and logo stages.</p>

          {/* Website URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              Website URL
            </label>
            <Input
              value={existingAssets.extracted_url || ''}
              onChange={(e) => updateAssets({ extracted_url: e.target.value || null })}
              placeholder="https://yourcompany.com"
              className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl"
            />
          </div>

          {/* Brand Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-zinc-500" />
              Brand Colors
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="color"
                  value={colorInput.startsWith('#') ? colorInput : '#000000'}
                  onChange={(e) => setColorInput(e.target.value)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
                  placeholder="#FF5500"
                  className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl pl-10"
                  maxLength={7}
                />
              </div>
              <button
                onClick={handleAddColor}
                className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {existingAssets.extracted_colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingAssets.extracted_colors.map((hex) => (
                  <div
                    key={hex}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40"
                  >
                    <div className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                    <span className="text-xs text-zinc-300 font-mono">{hex}</span>
                    <button onClick={() => handleRemoveColor(hex)} className="text-zinc-600 hover:text-red-400 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brand Fonts */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-zinc-500" />
              Font Names
            </label>
            <div className="flex gap-2">
              <Input
                value={fontInput}
                onChange={(e) => setFontInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFont()}
                placeholder="e.g. Inter, Playfair Display"
                className="flex-1 bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl"
              />
              <button
                onClick={handleAddFont}
                className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {existingAssets.extracted_fonts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingAssets.extracted_fonts.map((font) => (
                  <div
                    key={font}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40"
                  >
                    <span className="text-xs text-zinc-300">{font}</span>
                    <button onClick={() => handleRemoveFont(font)} className="text-zinc-600 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              Existing Logo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              multiple
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-6 rounded-xl border-2 border-dashed border-zinc-700/50 text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Click to upload logo files (SVG, PNG, JPG)
            </button>
            {existingAssets.logo_files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingAssets.logo_files.map((name, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40">
                    <span className="text-xs text-zinc-300">{name}</span>
                    <button
                      onClick={() => updateAssets({ logo_files: existingAssets.logo_files.filter((_, j) => j !== i) })}
                      className="text-zinc-600 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
