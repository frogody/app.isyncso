/**
 * FeedRulesEditor — Channable-style rules engine with sidebar list + detail panel.
 *
 * Rule types:
 *   - value_map:       IF field matches → SET target = value
 *   - find_replace:    IF field matches → find & replace with multiple pairs
 *   - calculation:     IF condition → SET target = expression (e.g. wholesale_price * 1.35)
 *   - static:          Always SET target = value
 *   - exclude:         IF condition → skip this row
 *   - price_adjustment: Percentage-based pricing (e.g. price * 1.05 for 5% markup)
 *
 * Features:
 *   - Sidebar rule list + right detail panel
 *   - Pause/activate individual rules
 *   - Find & replace with multiple replacement pairs
 *   - Regex + case sensitivity toggles
 *   - Compound sections (multiple IF→THEN per rule)
 *   - Quick templates
 */

import React, { useState, useMemo } from "react";
import {
  Plus, Trash2, ChevronDown, Zap, ArrowRight, Search,
  Pause, Play, Copy, GripVertical, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Constants ──────────────────────────────────────────────────────────────────

export const RULE_TYPES = [
  { id: "value_map", label: "Value Map", desc: "If field matches → set target value", color: "cyan" },
  { id: "find_replace", label: "Find & Replace", desc: "Find text and replace with multiple pairs", color: "purple" },
  { id: "calculation", label: "Calculation", desc: "Math expression on fields", color: "blue" },
  { id: "static", label: "Static Value", desc: "Always set a fixed value", color: "zinc" },
  { id: "exclude", label: "Exclude Row", desc: "Skip rows matching condition", color: "red" },
  { id: "price_adjustment", label: "Price Adjust", desc: "Percentage-based price change", color: "amber" },
];

const CONDITIONS = [
  { id: "equals", label: "equals" },
  { id: "not_equals", label: "not equals" },
  { id: "contains", label: "contains" },
  { id: "not_contains", label: "not contains" },
  { id: "starts_with", label: "starts with" },
  { id: "ends_with", label: "ends with" },
  { id: "matches_regex", label: "matches regex" },
  { id: "not_empty", label: "is not empty" },
  { id: "empty", label: "is empty" },
  { id: "greater_than", label: ">" },
  { id: "less_than", label: "<" },
];

export const TARGET_FIELDS = [
  { id: "ean", label: "EAN" },
  { id: "sku", label: "SKU" },
  { id: "name", label: "Product Name" },
  { id: "description", label: "Description" },
  { id: "brand", label: "Brand" },
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "retail_price", label: "Retail Price" },
  { id: "wholesale_price", label: "Wholesale Price" },
  { id: "stock", label: "Stock Quantity" },
  { id: "stock_status", label: "Stock Status" },
  { id: "image_url", label: "Image URL" },
  { id: "fulfilment_method", label: "Fulfilment Method" },
  { id: "condition", label: "Condition" },
  { id: "delivery_code", label: "Delivery Code" },
];

const QUICK_TEMPLATES = [
  {
    id: "stock_status_mapping",
    label: "Stock status mapping (Kasius)",
    rules: [
      { name: "Stock: op voorraad → 999", type: "value_map", sections: [{ source_field: "stock_status", condition: "equals", condition_value: "op voorraad", target_field: "stock", target_value: "999" }] },
      { name: "Stock: beperkt → 0", type: "value_map", sections: [{ source_field: "stock_status", condition: "equals", condition_value: "beperkt op voorraad", target_field: "stock", target_value: "0" }] },
      { name: "Exclude: niet voorraad", type: "exclude", sections: [{ source_field: "stock_status", condition: "equals", condition_value: "niet voorraad" }] },
    ],
  },
  {
    id: "price_markup",
    label: "Price markup (1.35x wholesale)",
    rules: [
      { name: "Price: 1.35x wholesale", type: "calculation", sections: [{ source_field: "wholesale_price", condition: "not_empty", target_field: "price", expression: "wholesale_price * 1.35" }] },
    ],
  },
  {
    id: "bolcom_defaults",
    label: "bol.com FBR defaults",
    rules: [
      { name: "Static: FBR", type: "static", sections: [{ target_field: "fulfilment_method", target_value: "FBR" }] },
      { name: "Static: NEW", type: "static", sections: [{ target_field: "condition", target_value: "NEW" }] },
      { name: "Static: 2-3d delivery", type: "static", sections: [{ target_field: "delivery_code", target_value: "2-3d" }] },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultSection(type) {
  return {
    id: generateId(),
    source_field: "",
    condition: "equals",
    condition_value: "",
    target_field: "",
    target_value: "",
    expression: "",
    replacements: [{ find: "", replace: "" }],
    adjustment_type: "multiply",
    adjustment_value: "",
  };
}

function createDefaultRule(overrides = {}) {
  return {
    id: generateId(),
    name: overrides.name || "New Rule",
    type: overrides.type || "value_map",
    is_active: true,
    sections: overrides.sections?.map((s) => ({ ...createDefaultSection(), ...s, id: generateId() })) || [createDefaultSection()],
    options: { case_sensitive: false, use_regex: false },
    priority: overrides.priority ?? 0,
  };
}

// Migrate flat legacy rules to section-based format
function migrateRule(rule) {
  if (rule.sections) return rule;
  return {
    id: rule.id || generateId(),
    name: rule.name || `${RULE_TYPES.find((t) => t.id === rule.type)?.label || "Rule"} #${rule.priority + 1}`,
    type: rule.type,
    is_active: rule.is_active !== false,
    sections: [{
      id: generateId(),
      source_field: rule.source_field || "",
      condition: rule.condition || "equals",
      condition_value: rule.condition_value || "",
      target_field: rule.target_field || "",
      target_value: rule.target_value ?? "",
      expression: rule.expression || "",
      replacements: [{ find: "", replace: "" }],
      adjustment_type: "multiply",
      adjustment_value: "",
    }],
    options: { case_sensitive: false, use_regex: false },
    priority: rule.priority ?? 0,
  };
}

const typeColorMap = {
  value_map: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  find_replace: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
  calculation: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  static: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" },
  exclude: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
  price_adjustment: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
};

// ── Section Editor ─────────────────────────────────────────────────────────────

function SectionEditor({ section, ruleType, sourceFields, onUpdate, onRemove, canRemove }) {
  const allSourceFields = sourceFields.length > 0
    ? sourceFields.map((f) => ({ id: f, label: f }))
    : TARGET_FIELDS;

  const updateField = (field, value) => onUpdate({ ...section, [field]: value });

  const needsConditionValue = !["not_empty", "empty"].includes(section.condition);
  const showCondition = !["static"].includes(ruleType);

  return (
    <div className="space-y-2.5 p-3 rounded-lg bg-zinc-900/40 border border-zinc-700/30">
      {/* Condition row */}
      {showCondition && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-cyan-400 w-6">IF</span>
          <select
            value={section.source_field}
            onChange={(e) => updateField("source_field", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
          >
            <option value="">Select field...</option>
            {allSourceFields.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <select
            value={section.condition}
            onChange={(e) => updateField("condition", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5"
          >
            {CONDITIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {needsConditionValue && (
            <Input
              value={section.condition_value || ""}
              onChange={(e) => updateField("condition_value", e.target.value)}
              placeholder="value..."
              className="max-w-[180px] bg-zinc-800/80 border-zinc-700/40 text-sm h-8"
            />
          )}
        </div>
      )}

      {/* Action row — varies by type */}
      {ruleType === "exclude" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-red-400 w-6">THEN</span>
          <span className="text-sm text-red-400">Exclude this row from import</span>
        </div>
      )}

      {ruleType === "value_map" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-cyan-400 w-6">SET</span>
          <select
            value={section.target_field}
            onChange={(e) => updateField("target_field", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
          >
            <option value="">Target field...</option>
            {TARGET_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={section.target_value ?? ""}
            onChange={(e) => updateField("target_value", e.target.value)}
            placeholder="value..."
            className="max-w-[180px] bg-zinc-800/80 border-zinc-700/40 text-sm h-8"
          />
        </div>
      )}

      {ruleType === "static" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-zinc-400 w-6">SET</span>
          <select
            value={section.target_field}
            onChange={(e) => updateField("target_field", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
          >
            <option value="">Target field...</option>
            {TARGET_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={section.target_value ?? ""}
            onChange={(e) => updateField("target_value", e.target.value)}
            placeholder="value..."
            className="max-w-[180px] bg-zinc-800/80 border-zinc-700/40 text-sm h-8"
          />
        </div>
      )}

      {ruleType === "calculation" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-blue-400 w-6">SET</span>
          <select
            value={section.target_field}
            onChange={(e) => updateField("target_field", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
          >
            <option value="">Target field...</option>
            {TARGET_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={section.expression || ""}
            onChange={(e) => updateField("expression", e.target.value)}
            placeholder="e.g. wholesale_price * 1.35"
            className="flex-1 min-w-[200px] bg-zinc-800/80 border-zinc-700/40 text-sm font-mono h-8"
          />
        </div>
      )}

      {ruleType === "price_adjustment" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-amber-400 w-6">SET</span>
          <select
            value={section.target_field}
            onChange={(e) => updateField("target_field", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
          >
            <option value="">Target field...</option>
            {TARGET_FIELDS.filter((f) => ["price", "retail_price", "wholesale_price"].includes(f.id)).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <select
            value={section.adjustment_type || "multiply"}
            onChange={(e) => updateField("adjustment_type", e.target.value)}
            className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5"
          >
            <option value="multiply">multiply by</option>
            <option value="add_percent">+ percentage</option>
            <option value="subtract_percent">- percentage</option>
            <option value="add_fixed">+ fixed amount</option>
            <option value="subtract_fixed">- fixed amount</option>
            <option value="round_up">round up to .99</option>
          </select>
          {!["round_up"].includes(section.adjustment_type) && (
            <Input
              value={section.adjustment_value || ""}
              onChange={(e) => updateField("adjustment_value", e.target.value)}
              placeholder={section.adjustment_type?.includes("percent") ? "e.g. 5" : "e.g. 1.35"}
              className="w-24 bg-zinc-800/80 border-zinc-700/40 text-sm font-mono h-8"
            />
          )}
          {section.adjustment_type?.includes("percent") && (
            <span className="text-xs text-zinc-500">%</span>
          )}
        </div>
      )}

      {ruleType === "find_replace" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-purple-400 w-6">IN</span>
            <select
              value={section.target_field}
              onChange={(e) => updateField("target_field", e.target.value)}
              className="rounded-lg bg-zinc-800/80 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[130px]"
            >
              <option value="">Target field...</option>
              {TARGET_FIELDS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          {(section.replacements || [{ find: "", replace: "" }]).map((pair, pIdx) => (
            <div key={pIdx} className="flex items-center gap-2 pl-8">
              <Input
                value={pair.find}
                onChange={(e) => {
                  const updated = [...(section.replacements || [])];
                  updated[pIdx] = { ...updated[pIdx], find: e.target.value };
                  updateField("replacements", updated);
                }}
                placeholder="find..."
                className="flex-1 bg-zinc-800/80 border-zinc-700/40 text-sm h-8"
              />
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <Input
                value={pair.replace}
                onChange={(e) => {
                  const updated = [...(section.replacements || [])];
                  updated[pIdx] = { ...updated[pIdx], replace: e.target.value };
                  updateField("replacements", updated);
                }}
                placeholder="replace with..."
                className="flex-1 bg-zinc-800/80 border-zinc-700/40 text-sm h-8"
              />
              <button
                onClick={() => {
                  const updated = (section.replacements || []).filter((_, i) => i !== pIdx);
                  updateField("replacements", updated.length > 0 ? updated : [{ find: "", replace: "" }]);
                }}
                className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const updated = [...(section.replacements || []), { find: "", replace: "" }];
              updateField("replacements", updated);
            }}
            className="ml-8 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add replacement pair
          </button>
        </div>
      )}

      {/* Remove section button */}
      {canRemove && (
        <div className="flex justify-end pt-1">
          <button onClick={onRemove} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
            Remove section
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FeedRulesEditor({ rules = [], onChange, sourceFields = [] }) {
  // Migrate legacy flat rules
  const migratedRules = useMemo(() => rules.map(migrateRule), [rules]);

  const [selectedId, setSelectedId] = useState(migratedRules[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedRule = migratedRules.find((r) => r.id === selectedId);

  // Filter rules by search
  const filteredRules = useMemo(() => {
    if (!searchQuery) return migratedRules;
    const q = searchQuery.toLowerCase();
    return migratedRules.filter((r) =>
      r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    );
  }, [migratedRules, searchQuery]);

  // ── Mutations ──

  const emitChange = (updatedRules) => {
    onChange(updatedRules.map((r, i) => ({ ...r, priority: i })));
  };

  const addRule = (overrides) => {
    const newRule = createDefaultRule({ ...overrides, priority: migratedRules.length });
    const updated = [...migratedRules, newRule];
    emitChange(updated);
    setSelectedId(newRule.id);
  };

  const updateSelectedRule = (field, value) => {
    if (!selectedRule) return;
    const updated = migratedRules.map((r) =>
      r.id === selectedId ? { ...r, [field]: value } : r
    );
    emitChange(updated);
  };

  const removeRule = (id) => {
    const updated = migratedRules.filter((r) => r.id !== id);
    emitChange(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  };

  const duplicateRule = (id) => {
    const source = migratedRules.find((r) => r.id === id);
    if (!source) return;
    const newRule = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: `${source.name} (copy)`,
    };
    newRule.sections.forEach((s) => { s.id = generateId(); });
    const idx = migratedRules.findIndex((r) => r.id === id);
    const updated = [...migratedRules];
    updated.splice(idx + 1, 0, newRule);
    emitChange(updated);
    setSelectedId(newRule.id);
  };

  const toggleActive = (id) => {
    const updated = migratedRules.map((r) =>
      r.id === id ? { ...r, is_active: !r.is_active } : r
    );
    emitChange(updated);
  };

  const moveRule = (id, dir) => {
    const idx = migratedRules.findIndex((r) => r.id === id);
    if (idx + dir < 0 || idx + dir >= migratedRules.length) return;
    const updated = [...migratedRules];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    emitChange(updated);
  };

  const addSection = () => {
    if (!selectedRule) return;
    const newSection = createDefaultSection(selectedRule.type);
    updateSelectedRule("sections", [...selectedRule.sections, newSection]);
  };

  const updateSection = (sectionId, data) => {
    if (!selectedRule) return;
    const updated = selectedRule.sections.map((s) =>
      s.id === sectionId ? data : s
    );
    updateSelectedRule("sections", updated);
  };

  const removeSection = (sectionId) => {
    if (!selectedRule) return;
    const updated = selectedRule.sections.filter((s) => s.id !== sectionId);
    if (updated.length === 0) return;
    updateSelectedRule("sections", updated);
  };

  const applyTemplate = (template) => {
    const newRules = template.rules.map((r, i) =>
      createDefaultRule({ ...r, priority: migratedRules.length + i })
    );
    const updated = [...migratedRules, ...newRules];
    emitChange(updated);
    if (newRules.length > 0) setSelectedId(newRules[0].id);
  };

  // ── Render ──

  const colors = selectedRule ? (typeColorMap[selectedRule.type] || typeColorMap.static) : typeColorMap.static;

  return (
    <div className="flex rounded-xl border border-zinc-700/40 bg-zinc-800/30 overflow-hidden" style={{ minHeight: 420 }}>
      {/* ── Left Sidebar: Rule List ── */}
      <div className="w-[240px] border-r border-zinc-700/30 flex flex-col bg-zinc-900/40 shrink-0">
        {/* Search + Add */}
        <div className="p-2.5 border-b border-zinc-700/30 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules..."
              className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            onClick={() => addRule()}
            className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-400 border border-dashed border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
          >
            <Plus className="w-3 h-3" /> Create Rule
          </button>
        </div>

        {/* Quick Templates */}
        <div className="px-2.5 py-2 border-b border-zinc-700/30">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5 px-0.5">Templates</p>
          <div className="space-y-1">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all text-left"
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span className="truncate">{tpl.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rule List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredRules.length === 0 && (
            <p className="text-center text-[11px] text-zinc-600 py-6">
              {searchQuery ? "No matching rules" : "No rules yet"}
            </p>
          )}
          {filteredRules.map((rule) => {
            const tc = typeColorMap[rule.type] || typeColorMap.static;
            const isSelected = selectedId === rule.id;
            return (
              <button
                key={rule.id}
                onClick={() => setSelectedId(rule.id)}
                className={`w-full text-left rounded-lg px-2.5 py-2 transition-all group ${
                  isSelected
                    ? "bg-zinc-800 border-l-2 border-cyan-500"
                    : "hover:bg-zinc-800/60 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tc.dot} ${!rule.is_active ? "opacity-30" : ""}`} />
                  <span className={`text-xs truncate flex-1 ${isSelected ? "text-zinc-100" : "text-zinc-400"} ${!rule.is_active ? "line-through opacity-50" : ""}`}>
                    {rule.name}
                  </span>
                  {!rule.is_active && (
                    <Pause className="w-3 h-3 text-zinc-600 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Rule Count */}
        <div className="px-3 py-2 border-t border-zinc-700/30 text-[11px] text-zinc-600">
          {migratedRules.length} rule{migratedRules.length !== 1 ? "s" : ""} · {migratedRules.filter((r) => r.is_active).length} active
        </div>
      </div>

      {/* ── Right Panel: Rule Detail ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRule ? (
          <>
            {/* Rule Header */}
            <div className="px-4 py-3 border-b border-zinc-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <input
                  value={selectedRule.name}
                  onChange={(e) => updateSelectedRule("name", e.target.value)}
                  className="text-sm font-semibold text-zinc-100 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 flex-1 truncate"
                  placeholder="Rule name..."
                />
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}>
                  {RULE_TYPES.find((t) => t.id === selectedRule.type)?.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => moveRule(selectedId, -1)}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveRule(selectedId, 1)}
                  className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                  title="Move down"
                >
                  ▼
                </button>
                <button
                  onClick={() => toggleActive(selectedId)}
                  className={`p-1.5 rounded-lg transition-all ${
                    selectedRule.is_active
                      ? "text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                      : "text-amber-500 bg-amber-500/10"
                  }`}
                  title={selectedRule.is_active ? "Pause rule" : "Activate rule"}
                >
                  {selectedRule.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => duplicateRule(selectedId)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40 transition-all"
                  title="Duplicate rule"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeRule(selectedId)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rule Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Paused banner */}
              {!selectedRule.is_active && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                  <Pause className="w-3.5 h-3.5" />
                  This rule is paused and will be skipped during sync
                </div>
              )}

              {/* Type selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-10">Type</span>
                <select
                  value={selectedRule.type}
                  onChange={(e) => updateSelectedRule("type", e.target.value)}
                  className="flex-1 rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5"
                >
                  {RULE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>

              {/* Options: case sensitivity + regex */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRule.options?.case_sensitive || false}
                    onChange={(e) =>
                      updateSelectedRule("options", { ...selectedRule.options, case_sensitive: e.target.checked })
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-cyan-500"
                  />
                  <span className="text-xs text-zinc-400">Case sensitive</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRule.options?.use_regex || false}
                    onChange={(e) =>
                      updateSelectedRule("options", { ...selectedRule.options, use_regex: e.target.checked })
                    }
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-cyan-500"
                  />
                  <span className="text-xs text-zinc-400">Use regex</span>
                </label>
              </div>

              {/* Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    {selectedRule.sections.length} section{selectedRule.sections.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {selectedRule.sections.map((section) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    ruleType={selectedRule.type}
                    sourceFields={sourceFields}
                    onUpdate={(data) => updateSection(section.id, data)}
                    onRemove={() => removeSection(section.id)}
                    canRemove={selectedRule.sections.length > 1}
                  />
                ))}

                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 border border-dashed border-zinc-700/40 hover:text-cyan-400 hover:border-cyan-500/30 transition-all justify-center"
                >
                  <Plus className="w-3 h-3" /> Add Section
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Settings2 className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Select a rule to edit</p>
              <p className="text-xs text-zinc-600 mt-1">Or create a new rule to get started</p>
              <button
                onClick={() => addRule()}
                className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
              >
                <Plus className="w-3 h-3" /> Create Rule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
