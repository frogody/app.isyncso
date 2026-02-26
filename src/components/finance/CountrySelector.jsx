import React, { useState, useMemo } from 'react';
import { Search, Globe, ChevronDown, X } from 'lucide-react';
import {
  EU_COUNTRIES,
  COMMON_NON_EU,
  determineTaxRulesForPurchase,
  determineTaxRulesForSale,
  getRubricColor,
  BTW_RUBRIC_LABELS,
} from '@/lib/btwRules';

/**
 * CountrySelector — searchable dropdown with auto-fill of Dutch BTW tax rules.
 *
 * Props:
 * - value: string (country code, e.g. "NL")
 * - onChange: (countryCode: string) => void
 * - onTaxRulesChange: ({ mechanism, selfAssessRate, rubric, explanation }) => void
 * - mode: "purchase" | "sale" (determines which rules to apply)
 * - taxRate: number (for sale mode, the invoice tax rate)
 * - label: string (optional label text)
 * - disabled: boolean
 * - className: string
 */
export default function CountrySelector({
  value,
  onChange,
  onTaxRulesChange,
  mode = 'purchase',
  taxRate = 21,
  label,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return [...EU_COUNTRIES, ...COMMON_NON_EU].find(
      (c) => c.code === value.toUpperCase()
    );
  }, [value]);

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase();
    const filter = (list) =>
      list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.nameNL.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    return {
      eu: filter(EU_COUNTRIES),
      nonEu: filter(COMMON_NON_EU),
    };
  }, [search]);

  const taxRules = useMemo(() => {
    if (!value) return null;
    return mode === 'purchase'
      ? determineTaxRulesForPurchase(value)
      : determineTaxRulesForSale(value, taxRate);
  }, [value, mode, taxRate]);

  const rubricColor = taxRules?.rubric ? getRubricColor(taxRules.rubric) : null;

  function handleSelect(code) {
    setIsOpen(false);
    setSearch('');
    onChange?.(code);

    const rules =
      mode === 'purchase'
        ? determineTaxRulesForPurchase(code)
        : determineTaxRulesForSale(code, taxRate);
    onTaxRulesChange?.(rules);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange?.('');
    onTaxRulesChange?.(null);
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700
                   bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
        {selectedCountry ? (
          <span className="flex-1 text-sm text-zinc-200 truncate">
            {selectedCountry.name}
          </span>
        ) : (
          <span className="flex-1 text-sm text-zinc-500">
            Selecteer land...
          </span>
        )}

        {/* Rubric badge */}
        {taxRules?.rubric && rubricColor && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rubricColor.bg} ${rubricColor.text} ${rubricColor.border} border`}
          >
            {taxRules.rubric}
          </span>
        )}

        {value ? (
          <X
            className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 shrink-0"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
      </button>

      {/* Tax explanation line */}
      {taxRules && value && (
        <p className="mt-1 text-[11px] text-zinc-500 leading-tight">
          {taxRules.explanation}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-72 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek land..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded
                             text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-56">
              {/* EU section */}
              {filteredCountries.eu.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-cyan-400 uppercase tracking-wider bg-zinc-900 sticky top-0">
                    EU-landen
                  </div>
                  {filteredCountries.eu.map((c) => (
                    <CountryOption
                      key={c.code}
                      country={c}
                      isSelected={value === c.code}
                      isEU
                      onClick={() => handleSelect(c.code)}
                      mode={mode}
                      taxRate={taxRate}
                    />
                  ))}
                </>
              )}

              {/* Non-EU section */}
              {filteredCountries.nonEu.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900 sticky top-0">
                    Buiten EU
                  </div>
                  {filteredCountries.nonEu.map((c) => (
                    <CountryOption
                      key={c.code}
                      country={c}
                      isSelected={value === c.code}
                      onClick={() => handleSelect(c.code)}
                      mode={mode}
                      taxRate={taxRate}
                    />
                  ))}
                </>
              )}

              {filteredCountries.eu.length === 0 &&
                filteredCountries.nonEu.length === 0 && (
                  <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                    Geen resultaten
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CountryOption({ country, isSelected, isEU, onClick, mode, taxRate }) {
  const rules =
    mode === 'purchase'
      ? determineTaxRulesForPurchase(country.code)
      : determineTaxRulesForSale(country.code, taxRate);
  const rubricColor = rules.rubric ? getRubricColor(rules.rubric) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800 transition-colors
        ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-300'}`}
    >
      <span className="text-xs font-mono text-zinc-500 w-6">{country.code}</span>
      <span className="flex-1 text-sm truncate">{country.name}</span>
      {isEU && (
        <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
          EU
        </span>
      )}
      {rules.rubric && rubricColor && (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rubricColor.bg} ${rubricColor.text}`}
        >
          {rules.rubric}
        </span>
      )}
    </button>
  );
}
