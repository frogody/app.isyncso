/**
 * FeedRulesEditor — Visual IF→THEN rule builder for product feed transformations.
 *
 * Rule types:
 *   - value_map:   IF field equals/contains value → SET target = value
 *   - calculation:  IF condition → SET target = expression (e.g. wholesale_price * 1.35)
 *   - static:       Always SET target = value
 *   - exclude:      IF condition → skip this row
 */

import React, { useState } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import {
  Plus, Trash2, GripVertical, ChevronDown, Zap, ArrowRight, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RULE_TYPES = [
  { id: "value_map", label: "Value Map", desc: "If field matches → set target value" },
  { id: "calculation", label: "Calculation", desc: "Math expression on fields" },
  { id: "static", label: "Static Value", desc: "Always set a fixed value" },
  { id: "exclude", label: "Exclude Row", desc: "Skip rows matching condition" },
];

const CONDITIONS = [
  { id: "equals", label: "equals" },
  { id: "not_equals", label: "not equals" },
  { id: "contains", label: "contains" },
  { id: "not_empty", label: "is not empty" },
  { id: "empty", label: "is empty" },
  { id: "greater_than", label: ">" },
  { id: "less_than", label: "<" },
];

const TARGET_FIELDS = [
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
];

const QUICK_TEMPLATES = [
  {
    id: "stock_status_mapping",
    label: "Stock status mapping (Kasius)",
    rules: [
      { type: "value_map", source_field: "stock_status", condition: "equals", condition_value: "op voorraad", target_field: "stock", target_value: 999 },
      { type: "value_map", source_field: "stock_status", condition: "equals", condition_value: "beperkt op voorraad", target_field: "stock", target_value: 0 },
      { type: "exclude", source_field: "stock_status", condition: "equals", condition_value: "niet voorraad", target_field: "", target_value: "" },
    ],
  },
  {
    id: "price_markup",
    label: "Price markup (1.35x wholesale)",
    rules: [
      { type: "calculation", source_field: "wholesale_price", condition: "not_empty", target_field: "price", expression: "wholesale_price * 1.35" },
    ],
  },
  {
    id: "bolcom_defaults",
    label: "bol.com FBR defaults",
    rules: [
      { type: "static", source_field: "", condition: "", target_field: "fulfilment_method", target_value: "FBR" },
      { type: "static", source_field: "", condition: "", target_field: "condition", target_value: "NEW" },
      { type: "static", source_field: "", condition: "", target_field: "delivery_code", target_value: "2-3d" },
    ],
  },
];

function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function FeedRulesEditor({ rules = [], onChange, sourceFields = [] }) {
  const { t } = useTheme();
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  const addRule = (template) => {
    const newRule = {
      id: generateId(),
      type: template?.type || "value_map",
      source_field: template?.source_field || "",
      condition: template?.condition || "equals",
      condition_value: template?.condition_value || "",
      target_field: template?.target_field || "",
      target_value: template?.target_value ?? "",
      expression: template?.expression || "",
      priority: rules.length,
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (idx, field, value) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeRule = (idx) => {
    const updated = rules.filter((_, i) => i !== idx);
    // Reindex priorities
    updated.forEach((r, i) => { r.priority = i; });
    onChange(updated);
  };

  const moveRule = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= rules.length) return;
    const updated = [...rules];
    [updated[idx], updated[idx + dir]] = [updated[idx + dir], updated[idx]];
    updated.forEach((r, i) => { r.priority = i; });
    onChange(updated);
  };

  const applyTemplate = (template) => {
    const newRules = template.rules.map((r, i) => ({
      ...r,
      id: generateId(),
      priority: rules.length + i,
    }));
    onChange([...rules, ...newRules]);
  };

  // Available source fields: from field mapping + custom
  const allSourceFields = [
    ...sourceFields.map((f) => ({ id: f, label: f })),
    ...(sourceFields.length === 0 ? TARGET_FIELDS : []),
  ];

  const ruleTypeColor = (type) => {
    switch (type) {
      case "value_map": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "calculation": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "static": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
      case "exclude": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Templates */}
      <div>
        <p className="text-sm text-zinc-400 mb-2">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              <Zap className="w-3 h-3" />
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.id || idx}
            className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4 space-y-3"
          >
            {/* Header: type badge + controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveRule(idx, -1)} className="text-zinc-500 hover:text-zinc-300 text-xs">▲</button>
                  <button onClick={() => moveRule(idx, 1)} className="text-zinc-500 hover:text-zinc-300 text-xs">▼</button>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${ruleTypeColor(rule.type)}`}>
                  {RULE_TYPES.find((t) => t.id === rule.type)?.label || rule.type}
                </span>
                <span className="text-xs text-zinc-500">#{idx + 1}</span>
              </div>
              <button
                onClick={() => removeRule(idx)}
                className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Rule type selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-12">Type</span>
              <select
                value={rule.type}
                onChange={(e) => updateRule(idx, "type", e.target.value)}
                className="flex-1 rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Condition row (not for static) */}
            {rule.type !== "static" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-cyan-400 font-medium">IF</span>
                <select
                  value={rule.source_field}
                  onChange={(e) => updateRule(idx, "source_field", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5 min-w-[140px]"
                >
                  <option value="">Select field...</option>
                  {allSourceFields.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={rule.condition}
                  onChange={(e) => updateRule(idx, "condition", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                {!["not_empty", "empty"].includes(rule.condition) && (
                  <Input
                    value={rule.condition_value || ""}
                    onChange={(e) => updateRule(idx, "condition_value", e.target.value)}
                    placeholder="value..."
                    className="max-w-[200px] bg-zinc-900/60 border-zinc-700/40 text-sm"
                  />
                )}
              </div>
            )}

            {/* Action row */}
            {rule.type === "exclude" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-medium">THEN</span>
                <span className="text-sm text-red-400">Exclude this row from import</span>
              </div>
            ) : rule.type === "calculation" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-blue-400 font-medium">THEN SET</span>
                <select
                  value={rule.target_field}
                  onChange={(e) => updateRule(idx, "target_field", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5 min-w-[140px]"
                >
                  <option value="">Target field...</option>
                  {TARGET_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <Input
                  value={rule.expression || ""}
                  onChange={(e) => updateRule(idx, "expression", e.target.value)}
                  placeholder="e.g. wholesale_price * 1.35"
                  className="flex-1 bg-zinc-900/60 border-zinc-700/40 text-sm font-mono"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-cyan-400 font-medium">THEN SET</span>
                <select
                  value={rule.target_field}
                  onChange={(e) => updateRule(idx, "target_field", e.target.value)}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-1.5 min-w-[140px]"
                >
                  <option value="">Target field...</option>
                  {TARGET_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <Input
                  value={rule.target_value ?? ""}
                  onChange={(e) => updateRule(idx, "target_value", e.target.value)}
                  placeholder="value..."
                  className="max-w-[200px] bg-zinc-900/60 border-zinc-700/40 text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Rule button */}
      <button
        onClick={() => addRule()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-dashed border-zinc-700/60 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Rule
      </button>

      {rules.length === 0 && (
        <p className="text-center text-sm text-zinc-500 py-4">
          No rules yet. Add rules to transform feed data before importing.
        </p>
      )}
    </div>
  );
}
