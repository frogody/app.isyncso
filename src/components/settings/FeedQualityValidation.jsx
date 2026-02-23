/**
 * FeedQualityValidation — Pre-push quality check for bol.com data.
 *
 * Validates: required fields, EAN format, price validity, delivery codes,
 * condition values. Shows errors grouped by field with fix suggestions.
 */

import React, { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle, Download, Eye, ArrowRight,
  Info, Shield, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Validation Rules ────────────────────────────────────────────────────────────

const BOLCOM_DELIVERY_CODES = [
  "24uurs-21", "24uurs-22", "24uurs-23", "1-2d", "2-3d", "3-5d", "4-8d", "1-8d",
];

const BOLCOM_CONDITIONS = ["NEW", "AS_NEW", "GOOD", "REASONABLE", "MODERATE"];

const BOLCOM_FULFILMENT = ["FBR", "FBB"];

function validateFeedData({ fieldMapping, rules, sampleRows, bolcomDefaults }) {
  const errors = [];
  const warnings = [];

  const mappedFields = Object.entries(fieldMapping || {})
    .filter(([_, v]) => v)
    .reduce((acc, [csv, target]) => {
      acc[target] = csv;
      return acc;
    }, {});

  // Required field checks
  const requiredFields = [
    { id: "ean", label: "EAN", reason: "EAN is required by bol.com to identify products" },
    { id: "name", label: "Product Name", reason: "Title/name is required for bol.com listings" },
  ];

  for (const field of requiredFields) {
    if (!mappedFields[field.id]) {
      errors.push({
        field: field.label,
        type: "missing_mapping",
        severity: "required",
        message: `No CSV column mapped to "${field.label}"`,
        fix: `Go to Field Mapping step and assign a CSV column to ${field.label}`,
        affected: sampleRows?.length || 0,
      });
    }
  }

  // Recommended field checks
  const recommendedFields = [
    { id: "price", label: "Price" },
    { id: "stock", label: "Stock Quantity" },
    { id: "brand", label: "Brand" },
    { id: "description", label: "Description" },
    { id: "image_url", label: "Image URL" },
  ];

  for (const field of recommendedFields) {
    if (!mappedFields[field.id]) {
      // Check if a rule sets this field statically
      const hasStaticRule = (rules || []).some(
        (r) => r.type === "static" && r.sections?.some((s) => s.target_field === field.id)
          || (r.target_field === field.id && r.type === "static")
      );
      // Check if a calculation rule sets this
      const hasCalcRule = (rules || []).some(
        (r) => (r.type === "calculation" || r.type === "value_map") &&
          (r.sections?.some((s) => s.target_field === field.id) || r.target_field === field.id)
      );

      if (!hasStaticRule && !hasCalcRule) {
        warnings.push({
          field: field.label,
          type: "missing_recommended",
          severity: "recommended",
          message: `"${field.label}" is not mapped and has no rule setting it`,
          fix: `Map a CSV column to ${field.label} or add a rule to set it`,
          affected: sampleRows?.length || 0,
        });
      }
    }
  }

  // Validate sample data quality
  if (sampleRows && sampleRows.length > 0 && mappedFields.ean) {
    let invalidEanCount = 0;
    let emptyEanCount = 0;

    for (const row of sampleRows) {
      const ean = row[mappedFields.ean];
      if (!ean || ean.trim() === "") {
        emptyEanCount++;
      } else {
        const cleaned = ean.replace(/\D/g, "");
        if (cleaned.length !== 13 && cleaned.length !== 8) {
          invalidEanCount++;
        }
      }
    }

    if (emptyEanCount > 0) {
      errors.push({
        field: "EAN",
        type: "empty_values",
        severity: "required",
        message: `${emptyEanCount} of ${sampleRows.length} sample rows have empty EAN`,
        fix: "Check your CSV source — bol.com requires a valid EAN for every product",
        affected: emptyEanCount,
      });
    }

    if (invalidEanCount > 0) {
      warnings.push({
        field: "EAN",
        type: "invalid_format",
        severity: "recommended",
        message: `${invalidEanCount} of ${sampleRows.length} sample rows have non-standard EAN format`,
        fix: "EAN should be 8 or 13 digits. Add a rule to clean EAN values if needed",
        affected: invalidEanCount,
      });
    }
  }

  // Validate price data
  if (sampleRows && mappedFields.price) {
    let invalidPriceCount = 0;
    for (const row of sampleRows) {
      const price = row[mappedFields.price];
      if (price) {
        const num = parseFloat(String(price).replace(",", "."));
        if (isNaN(num) || num <= 0) invalidPriceCount++;
      }
    }
    if (invalidPriceCount > 0) {
      warnings.push({
        field: "Price",
        type: "invalid_values",
        severity: "recommended",
        message: `${invalidPriceCount} sample rows have invalid or zero prices`,
        fix: "Ensure price values are positive numbers. Use a calculation rule if needed",
        affected: invalidPriceCount,
      });
    }
  }

  // Check bol.com defaults validity
  if (bolcomDefaults) {
    if (bolcomDefaults.delivery_code && !BOLCOM_DELIVERY_CODES.includes(bolcomDefaults.delivery_code)) {
      warnings.push({
        field: "Delivery Code",
        type: "invalid_default",
        severity: "recommended",
        message: `Delivery code "${bolcomDefaults.delivery_code}" may not be recognized by bol.com`,
        fix: `Use one of: ${BOLCOM_DELIVERY_CODES.join(", ")}`,
        affected: 0,
      });
    }
    if (bolcomDefaults.condition && !BOLCOM_CONDITIONS.includes(bolcomDefaults.condition)) {
      errors.push({
        field: "Condition",
        type: "invalid_default",
        severity: "required",
        message: `Condition "${bolcomDefaults.condition}" is not valid for bol.com`,
        fix: `Use one of: ${BOLCOM_CONDITIONS.join(", ")}`,
        affected: 0,
      });
    }
  }

  // Check if stock rules exist when stock_status is mapped but stock isn't
  if (mappedFields.stock_status && !mappedFields.stock) {
    const hasStockRule = (rules || []).some((r) =>
      r.sections?.some((s) => s.target_field === "stock") || r.target_field === "stock"
    );
    if (!hasStockRule) {
      errors.push({
        field: "Stock Quantity",
        type: "missing_stock_rule",
        severity: "required",
        message: "Stock status is mapped but no rule converts it to a numeric stock value",
        fix: 'Add a Value Map or Calculation rule to convert stock_status text to numeric stock quantity',
        affected: sampleRows?.length || 0,
      });
    }
  }

  // Check for duplicate rules (same source + condition + target)
  const ruleSignatures = new Set();
  for (const rule of (rules || [])) {
    for (const s of (rule.sections || [])) {
      const sig = `${rule.type}:${s.source_field}:${s.condition}:${s.condition_value}:${s.target_field}`;
      if (ruleSignatures.has(sig)) {
        warnings.push({
          field: "Rules",
          type: "duplicate_rule",
          severity: "optional",
          message: `Duplicate rule detected: ${rule.name || rule.type}`,
          fix: "Remove or merge duplicate rules to avoid unexpected behavior",
          affected: 0,
        });
      }
      ruleSignatures.add(sig);
    }
  }

  return { errors, warnings };
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function FeedQualityValidation({
  fieldMapping,
  rules,
  sampleRows,
  bolcomDefaults,
  onNavigateToStep,
}) {
  const [showOptional, setShowOptional] = useState(false);

  const { errors, warnings } = useMemo(
    () => validateFeedData({ fieldMapping, rules, sampleRows, bolcomDefaults }),
    [fieldMapping, rules, sampleRows, bolcomDefaults]
  );

  const allIssues = [...errors, ...warnings];
  const requiredIssues = allIssues.filter((i) => i.severity === "required");
  const recommendedIssues = allIssues.filter((i) => i.severity === "recommended");
  const optionalIssues = allIssues.filter((i) => i.severity === "optional");

  const displayIssues = showOptional
    ? allIssues
    : allIssues.filter((i) => i.severity !== "optional");

  const exportCSV = () => {
    const header = "Field,Severity,Issue,Fix Suggestion,Affected Items\n";
    const rows = allIssues.map((i) =>
      `"${i.field}","${i.severity}","${i.message}","${i.fix}",${i.affected}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feed-quality-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const severityIcon = (sev) => {
    switch (sev) {
      case "required": return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
      case "recommended": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default: return <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    }
  };

  const severityDot = (sev) => {
    switch (sev) {
      case "required": return "bg-red-400";
      case "recommended": return "bg-amber-400";
      default: return "bg-zinc-500";
    }
  };

  const hasBlockingErrors = requiredIssues.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {hasBlockingErrors ? (
            <div className="flex items-center gap-2 text-red-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">{requiredIssues.length} issue{requiredIssues.length !== 1 ? "s" : ""} must be fixed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Quality check passed</span>
            </div>
          )}
          {recommendedIssues.length > 0 && (
            <span className="text-xs text-amber-400">{recommendedIssues.length} recommendation{recommendedIssues.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showOptional}
              onChange={(e) => setShowOptional(e.target.checked)}
              className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-cyan-500"
            />
            Show optional
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="border-zinc-700/40 text-zinc-400 text-xs h-7"
          >
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Required ({requiredIssues.length})
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Recommended ({recommendedIssues.length})
        </span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-500/10 border border-zinc-700/30 text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          Optional ({optionalIssues.length})
        </span>
      </div>

      {/* Issues table */}
      {displayIssues.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-zinc-700/30 bg-zinc-800/30">
          <CheckCircle className="w-8 h-8 text-green-500/60 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No quality issues detected</p>
          <p className="text-xs text-zinc-600 mt-1">Your feed data looks good for bol.com</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700/30 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[140px_1fr_80px_1fr_80px] gap-3 px-4 py-2.5 bg-zinc-800/60 border-b border-zinc-700/30 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Field</span>
            <span>Issue</span>
            <span>Items</span>
            <span>How to Fix</span>
            <span>Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-700/20">
            {displayIssues.map((issue, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[140px_1fr_80px_1fr_80px] gap-3 px-4 py-3 items-start hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(issue.severity)}`} />
                  <span className="text-xs font-medium text-zinc-200">{issue.field}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  {severityIcon(issue.severity)}
                  <span className="text-xs text-zinc-300">{issue.message}</span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {issue.affected > 0 ? issue.affected.toLocaleString() : "—"}
                </span>
                <span className="text-xs text-zinc-500">{issue.fix}</span>
                <div>
                  {issue.type === "missing_mapping" && onNavigateToStep && (
                    <button
                      onClick={() => onNavigateToStep(2)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Go to mapping
                    </button>
                  )}
                  {(issue.type === "missing_stock_rule" || issue.type === "duplicate_rule") && onNavigateToStep && (
                    <button
                      onClick={() => onNavigateToStep(3)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Go to rules
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { validateFeedData };
