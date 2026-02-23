/**
 * FeedCategoryMapping — Condition-based category mapping for bol.com.
 *
 * Maps products to bol.com categories using IF→THEN rules:
 *   IF title contains "oorring" → category = Oorbellen
 *
 * Shows categorization progress with stacked bar.
 */

import React, { useState, useMemo } from "react";
import {
  Plus, Trash2, Search, Tag, Sparkles, ChevronDown,
  CheckCircle, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Common bol.com categories for jewelry/general retail
const BOLCOM_CATEGORIES = [
  { id: "oorbellen", label: "Oorbellen", path: "Sieraden > Oorbellen" },
  { id: "armband_sieraad", label: "Armband (sieraad)", path: "Sieraden > Armbanden" },
  { id: "ring_sieraad", label: "Ring (sieraad)", path: "Sieraden > Ringen" },
  { id: "ketting_sieraad", label: "Ketting (sieraad)", path: "Sieraden > Kettingen" },
  { id: "hanger_sieraad", label: "Hanger (sieraad)", path: "Sieraden > Hangers" },
  { id: "broche", label: "Broche", path: "Sieraden > Broches" },
  { id: "manchetknopen", label: "Manchetknopen", path: "Sieraden > Manchetknopen" },
  { id: "horloge", label: "Horloge", path: "Horloges > Horloges" },
  { id: "zonnebril", label: "Zonnebril", path: "Mode > Zonnebrillen" },
  { id: "tas", label: "Tas", path: "Tassen & Portemonnees > Tassen" },
  { id: "portemonnee", label: "Portemonnee", path: "Tassen & Portemonnees > Portemonnees" },
  { id: "sjaal", label: "Sjaal", path: "Mode > Sjaals" },
  { id: "custom", label: "Custom category...", path: "" },
];

const CONDITIONS = [
  { id: "contains", label: "contains" },
  { id: "equals", label: "equals" },
  { id: "starts_with", label: "starts with" },
  { id: "ends_with", label: "ends with" },
  { id: "matches_regex", label: "matches regex" },
];

function generateId() {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function estimateMatches(mapping, sampleRows, fieldMapping) {
  if (!sampleRows || sampleRows.length === 0) return 0;

  const csvCol = Object.entries(fieldMapping || {}).find(([_, target]) => target === mapping.source_field)?.[0]
    || mapping.source_field;

  return sampleRows.filter((row) => {
    const val = String(row[csvCol] || "").toLowerCase();
    const cv = mapping.match_value.toLowerCase();
    switch (mapping.condition) {
      case "contains": return val.includes(cv);
      case "equals": return val === cv;
      case "starts_with": return val.startsWith(cv);
      case "ends_with": return val.endsWith(cv);
      default: return false;
    }
  }).length;
}

export default function FeedCategoryMapping({
  categoryMappings = [],
  onChange,
  sourceFields = [],
  sampleRows = [],
  fieldMapping = {},
}) {
  const [customCategory, setCustomCategory] = useState("");

  const allSourceFields = sourceFields.length > 0
    ? sourceFields.map((f) => ({ id: f, label: f }))
    : [{ id: "name", label: "Product Name" }, { id: "category", label: "Category" }, { id: "description", label: "Description" }];

  // Calculate stats
  const stats = useMemo(() => {
    const total = sampleRows.length;
    if (total === 0) return { total: 0, categorized: 0, uncategorized: 0, pct: 0 };

    let categorizedSet = new Set();
    for (const mapping of categoryMappings) {
      const csvCol = Object.entries(fieldMapping).find(([_, t]) => t === mapping.source_field)?.[0]
        || mapping.source_field;

      sampleRows.forEach((row, idx) => {
        const val = String(row[csvCol] || "").toLowerCase();
        const cv = mapping.match_value.toLowerCase();
        let matches = false;
        switch (mapping.condition) {
          case "contains": matches = val.includes(cv); break;
          case "equals": matches = val === cv; break;
          case "starts_with": matches = val.startsWith(cv); break;
          case "ends_with": matches = val.endsWith(cv); break;
        }
        if (matches) categorizedSet.add(idx);
      });
    }

    const categorized = categorizedSet.size;
    return {
      total,
      categorized,
      uncategorized: total - categorized,
      pct: total > 0 ? ((categorized / total) * 100).toFixed(1) : 0,
    };
  }, [categoryMappings, sampleRows, fieldMapping]);

  const addMapping = () => {
    const newMapping = {
      id: generateId(),
      source_field: "name",
      condition: "contains",
      match_value: "",
      bol_category: "",
      custom_category: "",
      priority: categoryMappings.length,
    };
    onChange([...categoryMappings, newMapping]);
  };

  const updateMapping = (id, field, value) => {
    const updated = categoryMappings.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange(updated);
  };

  const removeMapping = (id) => {
    onChange(categoryMappings.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Progress Dashboard */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
        <div className="flex items-center gap-6">
          {/* Big percentage */}
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-100">{stats.pct}%</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Categorized</p>
          </div>

          {/* Stacked bar */}
          <div className="flex-1">
            <div className="w-full h-3 rounded-full bg-zinc-700/40 overflow-hidden flex">
              {stats.categorized > 0 && (
                <div
                  className="bg-cyan-500 h-full transition-all"
                  style={{ width: `${stats.pct}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-zinc-400">Categorized ({stats.categorized})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span className="text-zinc-500">Uncategorized ({stats.uncategorized})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400">
        <Tag className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Map products to bol.com categories</p>
          <p className="text-blue-400/70 mt-0.5">
            Each rule maps products matching a condition to a bol.com category. First match wins — order matters.
          </p>
        </div>
      </div>

      {/* Mapping Rules */}
      <div className="space-y-2">
        {categoryMappings.map((mapping, idx) => {
          const matches = estimateMatches(mapping, sampleRows, fieldMapping);
          const categoryLabel = mapping.bol_category === "custom"
            ? mapping.custom_category || "Custom..."
            : BOLCOM_CATEGORIES.find((c) => c.id === mapping.bol_category)?.label || "Select...";

          return (
            <div
              key={mapping.id}
              className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">#{idx + 1}</span>
                <div className="flex items-center gap-2">
                  {matches > 0 && (
                    <span className="text-[11px] text-cyan-400 font-mono">{matches} matches</span>
                  )}
                  <button
                    onClick={() => removeMapping(mapping.id)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-cyan-400">IF</span>
                <select
                  value={mapping.source_field}
                  onChange={(e) => updateMapping(mapping.id, "source_field", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5"
                >
                  {allSourceFields.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={mapping.condition}
                  onChange={(e) => updateMapping(mapping.id, "condition", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <Input
                  value={mapping.match_value}
                  onChange={(e) => updateMapping(mapping.id, "match_value", e.target.value)}
                  placeholder="e.g. oorring"
                  className="max-w-[160px] bg-zinc-900/60 border-zinc-700/40 text-sm h-8"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-cyan-400">THEN</span>
                <span className="text-xs text-zinc-500">category =</span>
                <select
                  value={mapping.bol_category}
                  onChange={(e) => updateMapping(mapping.id, "bol_category", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5 min-w-[180px]"
                >
                  <option value="">Select category...</option>
                  {BOLCOM_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}{c.path ? ` (${c.path})` : ""}</option>
                  ))}
                </select>
                {mapping.bol_category === "custom" && (
                  <Input
                    value={mapping.custom_category || ""}
                    onChange={(e) => updateMapping(mapping.id, "custom_category", e.target.value)}
                    placeholder="Custom category name..."
                    className="max-w-[200px] bg-zinc-900/60 border-zinc-700/40 text-sm h-8"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add mapping button */}
      <button
        onClick={addMapping}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-medium border border-dashed border-zinc-700/40 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> Add Category Rule
      </button>

      {categoryMappings.length === 0 && (
        <p className="text-center text-xs text-zinc-600 py-4">
          No category mappings yet. Add rules to map products to bol.com categories.
        </p>
      )}
    </div>
  );
}
