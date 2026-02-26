/**
 * FeedPreview — Shows transformed data table before pushing to bol.com.
 *
 * Displays all items as they'll be sent, with error indicators per row,
 * search, column toggle, and summary sidebar.
 */

import React, { useState, useMemo } from "react";
import {
  Search, Columns3, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Filter,
} from "lucide-react";

const PREVIEW_COLUMNS = [
  { id: "ean", label: "EAN", width: "120px" },
  { id: "name", label: "Title", width: "1fr" },
  { id: "price", label: "Price", width: "80px" },
  { id: "stock", label: "Stock", width: "70px" },
  { id: "brand", label: "Brand", width: "100px" },
  { id: "category", label: "Category", width: "120px" },
  { id: "condition", label: "Condition", width: "80px" },
  { id: "delivery_code", label: "Delivery", width: "80px" },
  { id: "fulfilment_method", label: "Fulfilment", width: "80px" },
  { id: "image_url", label: "Image", width: "80px" },
  { id: "stock_status", label: "Stock Status", width: "100px" },
  { id: "description", label: "Description", width: "200px" },
];

function applyMappingAndRules(sampleRows, fieldMapping, rules) {
  if (!sampleRows || sampleRows.length === 0) return [];

  const reverseMapping = {};
  for (const [csv, target] of Object.entries(fieldMapping || {})) {
    if (target) reverseMapping[target] = csv;
  }

  return sampleRows.map((row) => {
    const mapped = {};
    let hasError = false;
    let isExcluded = false;
    const errorFields = [];

    // Apply field mapping
    for (const [target, csvCol] of Object.entries(reverseMapping)) {
      mapped[target] = row[csvCol] ?? "";
    }

    // Apply simple rules (only for preview — real rules run server-side)
    for (const rule of (rules || [])) {
      if (rule.is_active === false) continue;
      const sections = rule.sections || [{
        source_field: rule.source_field,
        condition: rule.condition,
        condition_value: rule.condition_value,
        target_field: rule.target_field,
        target_value: rule.target_value,
        expression: rule.expression,
      }];

      for (const section of sections) {
        const sourceValue = mapped[section.source_field] ?? row[reverseMapping[section.source_field] || section.source_field] ?? "";
        const sv = String(sourceValue).toLowerCase();
        const cv = String(section.condition_value || "").toLowerCase();

        let matches = false;
        switch (section.condition) {
          case "equals": matches = sv === cv; break;
          case "not_equals": matches = sv !== cv; break;
          case "contains": matches = sv.includes(cv); break;
          case "not_contains": matches = !sv.includes(cv); break;
          case "not_empty": matches = sv.length > 0; break;
          case "empty": matches = sv.length === 0; break;
          case "greater_than": matches = parseFloat(sv) > parseFloat(cv); break;
          case "less_than": matches = parseFloat(sv) < parseFloat(cv); break;
          default: matches = true;
        }

        if (rule.type === "static") matches = true;

        if (matches) {
          if (rule.type === "exclude") {
            isExcluded = true;
          } else if (rule.type === "value_map" || rule.type === "static") {
            if (section.target_field) mapped[section.target_field] = section.target_value;
          } else if (rule.type === "calculation" && section.expression) {
            try {
              const expr = section.expression.replace(/[a-z_]+/gi, (field) => {
                const val = parseFloat(mapped[field] || row[reverseMapping[field] || field] || "0");
                return isNaN(val) ? "0" : val;
              });
              if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(expr)) {
                mapped[section.target_field] = new Function(`return ${expr}`)().toFixed(2);
              }
            } catch { /* skip invalid expressions */ }
          }
        }
      }
    }

    // Validate key fields
    if (!mapped.ean || String(mapped.ean).trim() === "") {
      hasError = true;
      errorFields.push("ean");
    }
    if (!mapped.name || String(mapped.name).trim() === "") {
      hasError = true;
      errorFields.push("name");
    }
    const priceNum = parseFloat(String(mapped.price || "0").replace(",", "."));
    if (mapped.price && (isNaN(priceNum) || priceNum <= 0)) {
      hasError = true;
      errorFields.push("price");
    }

    return { ...mapped, _hasError: hasError, _isExcluded: isExcluded, _errorFields: errorFields, _raw: row };
  });
}

export default function FeedPreview({ sampleRows = [], fieldMapping = {}, rules = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(
    PREVIEW_COLUMNS.slice(0, 7).map((c) => c.id)
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // all, errors, excluded
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const transformedData = useMemo(
    () => applyMappingAndRules(sampleRows, fieldMapping, rules),
    [sampleRows, fieldMapping, rules]
  );

  const filteredData = useMemo(() => {
    let data = transformedData;

    if (filterMode === "errors") data = data.filter((r) => r._hasError);
    else if (filterMode === "excluded") data = data.filter((r) => r._isExcluded);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    return data;
  }, [transformedData, searchQuery, filterMode]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  const errorCount = transformedData.filter((r) => r._hasError).length;
  const excludedCount = transformedData.filter((r) => r._isExcluded).length;
  const successCount = transformedData.length - errorCount - excludedCount;

  const cols = PREVIEW_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  if (sampleRows.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-zinc-700/30 bg-zinc-800/30">
        <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">No preview data available</p>
        <p className="text-xs text-zinc-600 mt-1">Go back and load feed preview first</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by title or EAN..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center rounded-lg border border-zinc-700/40 overflow-hidden text-xs">
            <button
              onClick={() => { setFilterMode("all"); setPage(0); }}
              className={`px-3 py-1.5 transition-colors ${filterMode === "all" ? "bg-zinc-700/50 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              All ({transformedData.length})
            </button>
            <button
              onClick={() => { setFilterMode("errors"); setPage(0); }}
              className={`px-3 py-1.5 border-l border-zinc-700/40 transition-colors ${filterMode === "errors" ? "bg-red-500/10 text-red-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => { setFilterMode("excluded"); setPage(0); }}
              className={`px-3 py-1.5 border-l border-zinc-700/40 transition-colors ${filterMode === "excluded" ? "bg-amber-500/10 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Excluded ({excludedCount})
            </button>
          </div>
        </div>

        {/* Column picker */}
        <div className="relative">
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700/40 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <Columns3 className="w-3.5 h-3.5" /> Columns
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700/40 rounded-lg p-2 shadow-xl w-48 space-y-1">
              {PREVIEW_COLUMNS.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700/40">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVisibleColumns((prev) => [...prev, col.id]);
                      } else {
                        setVisibleColumns((prev) => prev.filter((c) => c !== col.id));
                      }
                    }}
                    className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-cyan-500"
                  />
                  <span className="text-xs text-zinc-300">{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary sidebar inline */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-green-400">
          <CheckCircle className="w-3.5 h-3.5" />
          {successCount} ready
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            {errorCount} errors
          </span>
        )}
        {excludedCount > 0 && (
          <span className="text-amber-400">{excludedCount} excluded</span>
        )}
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-zinc-700/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-800/60 border-b border-zinc-700/30">
                <th className="w-8 px-2 py-2.5 text-left text-zinc-600">#</th>
                {cols.map((col) => (
                  <th
                    key={col.id}
                    className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {pageData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    row._isExcluded
                      ? "bg-amber-500/5 text-zinc-600 line-through"
                      : row._hasError
                      ? "bg-red-500/5"
                      : "hover:bg-zinc-800/30"
                  }`}
                >
                  <td className="px-2 py-2 text-zinc-600 font-mono">
                    {row._hasError && !row._isExcluded && (
                      <AlertTriangle className="w-3 h-3 text-red-400 inline" />
                    )}
                    {row._isExcluded && (
                      <span className="text-amber-500 text-[10px]">EX</span>
                    )}
                    {!row._hasError && !row._isExcluded && (
                      <span>{page * pageSize + idx + 1}</span>
                    )}
                  </td>
                  {cols.map((col) => {
                    const val = row[col.id] ?? "";
                    const isError = row._errorFields?.includes(col.id);
                    const display = col.id === "image_url" && val
                      ? (val.length > 30 ? val.substring(0, 30) + "..." : val)
                      : String(val).length > 50 ? String(val).substring(0, 50) + "..." : String(val);

                    return (
                      <td
                        key={col.id}
                        className={`px-3 py-2 whitespace-nowrap ${
                          isError ? "text-red-400 font-medium" : "text-zinc-300"
                        } ${!val || val === "" ? "text-zinc-700 italic" : ""}`}
                      >
                        {val === "" || val === undefined ? "—" : display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-700/30 bg-zinc-800/30">
            <span className="text-[11px] text-zinc-500">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-zinc-400 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
