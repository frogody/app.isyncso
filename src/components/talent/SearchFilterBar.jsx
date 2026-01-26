import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Briefcase,
  Brain,
  Building2,
  GraduationCap,
  Clock,
  ChevronDown,
  Mail,
  Linkedin,
  Sparkles,
  Target,
  Check,
} from "lucide-react";
import debounce from "lodash/debounce";

// Filter Row Container
const FilterRow = ({ children }) => (
  <div className="flex flex-wrap gap-4">{children}</div>
);

// Multi-Select Dropdown Filter
const MultiSelectFilter = ({ icon: Icon, label, options, selected, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt) => {
    const newSelected = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(newSelected);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative flex-1 min-w-[180px]" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
          selected.length > 0
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-zinc-700/50 border-zinc-600 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon className="w-4 h-4 shrink-0" />
          <span className={selected.length > 0 ? "text-white" : ""}>
            {selected.length > 0 ? `${label} (${selected.length})` : placeholder || label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <button
              onClick={clearAll}
              className="p-0.5 hover:bg-zinc-600 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-30 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-hidden"
          >
            {options.length > 5 && (
              <div className="p-2 border-b border-zinc-700">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-700 rounded text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-700 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selected.includes(opt)
                          ? "bg-red-500 border-red-500"
                          : "border-zinc-600 bg-zinc-700"
                      }`}
                    >
                      {selected.includes(opt) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-zinc-300 truncate">{opt}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-zinc-500 px-2 py-2">No options found</p>
              )}
            </div>
            {selected.length > 0 && (
              <div className="p-2 border-t border-zinc-700">
                <button
                  onClick={() => onChange([])}
                  className="w-full text-xs text-zinc-400 hover:text-white py-1"
                >
                  Clear selection
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Range Filter (Min/Max)
const RangeFilter = ({ icon: Icon, label, min, max, valueMin, valueMax, onChange, unit }) => {
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={valueMin ?? ""}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null, valueMax)
          }
          placeholder="Min"
          min={min}
          max={max}
          className="w-20 px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <span className="text-zinc-500">-</span>
        <input
          type="number"
          value={valueMax ?? ""}
          onChange={(e) =>
            onChange(valueMin, e.target.value ? Number(e.target.value) : null)
          }
          placeholder="Max"
          min={min}
          max={max}
          className="w-20 px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        {unit && <span className="text-xs text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
};

// Toggle Filter (Checkbox)
const ToggleFilter = ({ icon: Icon, label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg hover:border-zinc-500 transition-colors">
    <div
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked ? "bg-red-500 border-red-500" : "border-zinc-600 bg-zinc-700"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </div>
    {Icon && <Icon className="w-4 h-4 text-zinc-400" />}
    <span className="text-sm text-zinc-300">{label}</span>
  </label>
);

// Select Filter (Single value dropdown)
const SelectFilter = ({ icon: Icon, label, options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative flex-1 min-w-[150px]" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
          value
            ? "bg-red-500/10 border-red-500/30 text-white"
            : "bg-zinc-700/50 border-zinc-600 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          <span>{selectedOption?.label || placeholder || label}</span>
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-0.5 hover:bg-zinc-600 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-30 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="p-1 space-y-0.5">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition-colors ${
                    value === opt.value
                      ? "bg-red-500/20 text-red-400"
                      : "text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Search Filter Bar Component
export default function SearchFilterBar({
  onSearch,
  onFiltersChange,
  availableFilters = {},
  activeFilterCount = 0,
  placeholder = "Search by name, title, company, skills...",
  showIntelFilters = true,
  compact = false,
  searchInputRef,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    locations: [],
    skills: [],
    titles: [],
    companies: [],
    intelligenceLevels: [],
    approaches: [],
    intelScoreMin: null,
    intelScoreMax: null,
    experienceYearsMin: null,
    experienceYearsMax: null,
    hasEmail: null,
    hasLinkedIn: null,
    hasIntel: null,
    lastUpdatedDays: null,
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        onSearch(query);
      }, 300),
    [onSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    onSearch("");
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      locations: [],
      skills: [],
      titles: [],
      companies: [],
      intelligenceLevels: [],
      approaches: [],
      intelScoreMin: null,
      intelScoreMax: null,
      experienceYearsMin: null,
      experienceYearsMax: null,
      hasEmail: null,
      hasLinkedIn: null,
      hasIntel: null,
      lastUpdatedDays: null,
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
            showFilters || activeFilterCount > 0
              ? "bg-red-500/20 border-red-500/50 text-red-400"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-4">
              {/* Row 1: Location, Title, Company */}
              <FilterRow>
                <MultiSelectFilter
                  icon={MapPin}
                  label="Location"
                  placeholder="Any location"
                  options={availableFilters.locations || []}
                  selected={filters.locations}
                  onChange={(v) => updateFilter("locations", v)}
                />
                <MultiSelectFilter
                  icon={Briefcase}
                  label="Job Title"
                  placeholder="Any title"
                  options={availableFilters.titles || []}
                  selected={filters.titles}
                  onChange={(v) => updateFilter("titles", v)}
                />
                <MultiSelectFilter
                  icon={Building2}
                  label="Company"
                  placeholder="Any company"
                  options={availableFilters.companies || []}
                  selected={filters.companies}
                  onChange={(v) => updateFilter("companies", v)}
                />
              </FilterRow>

              {/* Row 2: Skills, Intel Score, Experience */}
              <FilterRow>
                <MultiSelectFilter
                  icon={GraduationCap}
                  label="Skills"
                  placeholder="Any skills"
                  options={availableFilters.skills || []}
                  selected={filters.skills}
                  onChange={(v) => updateFilter("skills", v)}
                />
                {showIntelFilters && (
                  <RangeFilter
                    icon={Brain}
                    label="Intel Score"
                    min={0}
                    max={100}
                    valueMin={filters.intelScoreMin}
                    valueMax={filters.intelScoreMax}
                    onChange={(min, max) => {
                      const newFilters = {
                        ...filters,
                        intelScoreMin: min,
                        intelScoreMax: max,
                      };
                      setFilters(newFilters);
                      onFiltersChange(newFilters);
                    }}
                  />
                )}
                <RangeFilter
                  icon={Clock}
                  label="Experience"
                  min={0}
                  max={30}
                  valueMin={filters.experienceYearsMin}
                  valueMax={filters.experienceYearsMax}
                  onChange={(min, max) => {
                    const newFilters = {
                      ...filters,
                      experienceYearsMin: min,
                      experienceYearsMax: max,
                    };
                    setFilters(newFilters);
                    onFiltersChange(newFilters);
                  }}
                  unit="yrs"
                />
              </FilterRow>

              {/* Row 3: Intel Level, Approach, Contact Info */}
              {showIntelFilters && (
                <FilterRow>
                  <MultiSelectFilter
                    icon={Sparkles}
                    label="Intel Level"
                    placeholder="Any level"
                    options={availableFilters.intelligenceLevels || ["Critical", "High", "Medium", "Low"]}
                    selected={filters.intelligenceLevels}
                    onChange={(v) => updateFilter("intelligenceLevels", v)}
                  />
                  <MultiSelectFilter
                    icon={Target}
                    label="Approach"
                    placeholder="Any approach"
                    options={availableFilters.approaches || ["aggressive", "nurture", "network"]}
                    selected={filters.approaches}
                    onChange={(v) => updateFilter("approaches", v)}
                  />
                  <SelectFilter
                    icon={Clock}
                    label="Last Updated"
                    placeholder="Any time"
                    options={[
                      { value: 7, label: "Last 7 days" },
                      { value: 30, label: "Last 30 days" },
                      { value: 90, label: "Last 90 days" },
                      { value: 180, label: "Last 6 months" },
                    ]}
                    value={filters.lastUpdatedDays}
                    onChange={(v) => updateFilter("lastUpdatedDays", v)}
                  />
                </FilterRow>
              )}

              {/* Row 4: Toggle filters */}
              <FilterRow>
                <ToggleFilter
                  icon={Mail}
                  label="Has Email"
                  checked={filters.hasEmail === true}
                  onChange={(v) => updateFilter("hasEmail", v ? true : null)}
                />
                <ToggleFilter
                  icon={Linkedin}
                  label="Has LinkedIn"
                  checked={filters.hasLinkedIn === true}
                  onChange={(v) => updateFilter("hasLinkedIn", v ? true : null)}
                />
                {showIntelFilters && (
                  <ToggleFilter
                    icon={Brain}
                    label="Has Intel Data"
                    checked={filters.hasIntel === true}
                    onChange={(v) => updateFilter("hasIntel", v ? true : null)}
                  />
                )}
              </FilterRow>

              {/* Clear all button */}
              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-3 border-t border-zinc-700">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear all filters ({activeFilterCount})
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export sub-components for use elsewhere
export { MultiSelectFilter, RangeFilter, ToggleFilter, SelectFilter, FilterRow };
