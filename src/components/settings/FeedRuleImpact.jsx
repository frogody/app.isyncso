/**
 * FeedRuleImpact — Shows item counts before/after rule application.
 *
 * For each rule, calculates how many items are affected:
 *   - Items matching the condition (before)
 *   - Items with changed values (after)
 *   - Items excluded
 *
 * Inspired by Channable's "Items voor / Items na" display.
 */

import React, { useState, useMemo } from "react";
import {
  BarChart3, ArrowRight, Loader2, Calculator, Filter,
  CheckCircle, XCircle, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function evaluateCondition(value, condition, conditionValue, options = {}) {
  const v = (value ?? "").toString();
  const cv = (conditionValue ?? "").toString();
  const caseSensitive = options.case_sensitive;
  const useRegex = options.use_regex;

  const lv = caseSensitive ? v : v.toLowerCase();
  const lcv = caseSensitive ? cv : cv.toLowerCase();

  switch (condition) {
    case "equals": return lv === lcv;
    case "not_equals": return lv !== lcv;
    case "contains": return lv.includes(lcv);
    case "not_contains": return !lv.includes(lcv);
    case "starts_with": return lv.startsWith(lcv);
    case "ends_with": return lv.endsWith(lcv);
    case "matches_regex":
      try { return new RegExp(cv, caseSensitive ? "" : "i").test(v); }
      catch { return false; }
    case "not_empty": return v.trim().length > 0;
    case "empty": return v.trim().length === 0;
    case "greater_than": return parseFloat(v) > parseFloat(cv);
    case "less_than": return parseFloat(v) < parseFloat(cv);
    default: return true;
  }
}

function applyRuleToRow(row, rule, fieldMapping) {
  if (!rule.is_active) return { matched: false, excluded: false, changes: {} };

  const sections = rule.sections || [];
  const options = rule.options || {};
  let matched = false;
  let excluded = false;
  const changes = {};

  for (const section of sections) {
    const csvCol = Object.entries(fieldMapping || {}).find(
      ([_, target]) => target === section.source_field
    )?.[0] || section.source_field;

    const sourceVal = (row[csvCol] ?? "").toString();

    // Static rules always apply
    const isStatic = rule.type === "static";
    const conditionMet = isStatic || evaluateCondition(sourceVal, section.condition, section.condition_value, options);

    if (!conditionMet) continue;
    matched = true;

    switch (rule.type) {
      case "value_map":
        changes[section.target_field] = section.target_value;
        break;
      case "find_replace":
        if (section.replacements) {
          let result = sourceVal;
          for (const pair of section.replacements) {
            if (pair.find) {
              if (options.use_regex) {
                try {
                  const re = new RegExp(pair.find, options.case_sensitive ? "g" : "gi");
                  result = result.replace(re, pair.replace || "");
                } catch { /* skip bad regex */ }
              } else {
                const flags = options.case_sensitive ? "g" : "gi";
                result = result.replace(new RegExp(pair.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags), pair.replace || "");
              }
            }
          }
          changes[section.target_field || section.source_field] = result;
        }
        break;
      case "calculation":
        changes[section.target_field] = "(calculated)";
        break;
      case "static":
        changes[section.target_field] = section.target_value;
        break;
      case "exclude":
        excluded = true;
        break;
      case "price_adjustment":
        changes[section.target_field || "price"] = "(adjusted)";
        break;
    }
  }

  return { matched, excluded, changes };
}

export default function FeedRuleImpact({
  rules = [],
  sampleRows = [],
  fieldMapping = {},
}) {
  const [calculated, setCalculated] = useState(false);
  const [loading, setLoading] = useState(false);

  const impacts = useMemo(() => {
    if (!calculated || sampleRows.length === 0) return [];

    return rules.map((rule) => {
      let matchCount = 0;
      let excludeCount = 0;
      let changeCount = 0;

      for (const row of sampleRows) {
        const result = applyRuleToRow(row, rule, fieldMapping);
        if (result.matched) matchCount++;
        if (result.excluded) excludeCount++;
        if (Object.keys(result.changes).length > 0) changeCount++;
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name || `Rule ${rule.priority + 1}`,
        ruleType: rule.type,
        isActive: rule.is_active !== false,
        itemsBefore: sampleRows.length,
        itemsMatched: matchCount,
        itemsExcluded: excludeCount,
        itemsChanged: changeCount,
        itemsAfter: sampleRows.length - excludeCount,
        matchPct: sampleRows.length > 0 ? ((matchCount / sampleRows.length) * 100).toFixed(1) : 0,
      };
    });
  }, [calculated, rules, sampleRows, fieldMapping]);

  const handleCalculate = () => {
    setLoading(true);
    // Small timeout to show loading state for UX
    setTimeout(() => {
      setCalculated(true);
      setLoading(false);
    }, 300);
  };

  const totalExcluded = impacts.reduce((sum, i) => sum + i.itemsExcluded, 0);
  const totalChanged = impacts.reduce((sum, i) => sum + i.itemsChanged, 0);
  const finalItemCount = sampleRows.length - totalExcluded;

  const typeColors = {
    value_map: "text-cyan-400",
    find_replace: "text-purple-400",
    calculation: "text-blue-400",
    static: "text-zinc-400",
    exclude: "text-red-400",
    price_adjustment: "text-amber-400",
  };

  const typeBgColors = {
    value_map: "bg-cyan-500/10",
    find_replace: "bg-purple-500/10",
    calculation: "bg-blue-500/10",
    static: "bg-zinc-500/10",
    exclude: "bg-red-500/10",
    price_adjustment: "bg-amber-500/10",
  };

  if (rules.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl border border-dashed border-zinc-700/40">
        <BarChart3 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No rules to analyze</p>
        <p className="text-xs text-zinc-600 mt-1">Add rules first to see their impact</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with calculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Rule Impact Analysis
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            See how each rule affects your {sampleRows.length.toLocaleString()} sample items
          </p>
        </div>
        <Button
          onClick={handleCalculate}
          disabled={loading || sampleRows.length === 0}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Calculator className="w-3.5 h-3.5 mr-1" />
          )}
          {calculated ? "Recalculate" : "Calculate Impact"}
        </Button>
      </div>

      {sampleRows.length === 0 && (
        <div className="text-center py-6 rounded-xl border border-dashed border-zinc-700/40">
          <p className="text-xs text-zinc-500">Load a feed preview first to analyze rule impact</p>
        </div>
      )}

      {calculated && impacts.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-6 p-3 rounded-xl border border-zinc-700/30 bg-zinc-800/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-100">{sampleRows.length.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-500">Items in</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600" />
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-cyan-400">{totalChanged.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-500">Changed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-red-400">{totalExcluded.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-500">Excluded</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{finalItemCount.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-500">Items out</p>
            </div>
          </div>

          {/* Per-rule breakdown */}
          <div className="space-y-1.5">
            {impacts.map((impact) => (
              <div
                key={impact.ruleId}
                className={`flex items-center justify-between p-3 rounded-xl border border-zinc-700/30 ${
                  impact.isActive ? "bg-zinc-800/30" : "bg-zinc-900/20 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${impact.isActive ? (typeColors[impact.ruleType]?.replace("text-", "bg-") || "bg-zinc-400") : "bg-zinc-600"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{impact.ruleName}</p>
                    <p className={`text-[11px] ${typeColors[impact.ruleType] || "text-zinc-500"}`}>
                      {impact.ruleType.replace("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  {/* Matches */}
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-400">{impact.itemsMatched}</span>
                    <span className="text-zinc-600">({impact.matchPct}%)</span>
                  </div>

                  {/* Impact */}
                  {impact.ruleType === "exclude" ? (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">-{impact.itemsExcluded}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-400">{impact.itemsChanged} changed</span>
                    </div>
                  )}

                  {/* Match bar */}
                  <div className="w-20 h-1.5 rounded-full bg-zinc-700/40 overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        impact.ruleType === "exclude" ? "bg-red-400" : "bg-cyan-400"
                      }`}
                      style={{ width: `${Math.min(100, impact.matchPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
