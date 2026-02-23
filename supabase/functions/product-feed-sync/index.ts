/**
 * Product Feed Sync Edge Function
 *
 * Actions:
 *   - testUrl:        Validate CSV URL is reachable, return row count (streaming)
 *   - previewFeed:    Fetch first 20 rows of CSV, return headers + sample data (streaming)
 *   - syncFeed:       Full sync pipeline for one feed (streaming fetch → parse → transform → upsert)
 *   - syncAllActive:  Called by pg_cron — syncs all feeds whose interval has elapsed
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_SIZE = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// Types
// ============================================================

// Section within a rule (compound sections allow multiple IF→THEN per rule)
interface RuleSection {
  id?: string;
  source_field: string;
  condition: string;
  condition_value?: string;
  target_field?: string;
  target_value?: string | number;
  expression?: string;
  replacements?: Array<{ find: string; replace: string }>;
  adjustment_type?: "multiply" | "add_percent" | "subtract_percent" | "add_fixed" | "subtract_fixed" | "round_up";
  adjustment_value?: string;
}

// New section-based rule format (backward-compatible with legacy flat rules)
interface TransformationRule {
  id: string;
  name?: string;
  type: "value_map" | "find_replace" | "calculation" | "static" | "exclude" | "price_adjustment";
  is_active?: boolean;
  sections?: RuleSection[];
  options?: { case_sensitive?: boolean; use_regex?: boolean };
  // Legacy flat fields (migrated to sections at runtime)
  source_field?: string;
  condition?: string;
  condition_value?: string;
  target_field?: string;
  target_value?: string | number;
  expression?: string;
  priority: number;
}

// Category mapping rule
interface CategoryMapping {
  id: string;
  source_field: string;
  condition: string;
  match_value: string;
  bol_category: string;
  custom_category?: string;
  priority: number;
}

interface FeedConfig {
  id: string;
  company_id: string;
  name: string;
  feed_url: string;
  delimiter: string;
  encoding: string;
  has_header_row: boolean;
  sync_interval: string;
  is_active: boolean;
  auto_push_offers: boolean;
  field_mapping: Record<string, string>;
  transformation_rules: TransformationRule[];
  category_mappings: CategoryMapping[];
  master_rule_group_id: string | null;
  bolcom_defaults: Record<string, string>;
  last_sync_at: string | null;
}

// ============================================================
// CSV Line Parser (parses a single CSV line into fields)
// ============================================================

function parseCsvLine(line: string, delimiter = ","): string[] {
  const fields: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === delimiter && !inQ) {
      fields.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

// ============================================================
// Streaming CSV reader — yields complete CSV lines from a stream
// Handles quoted fields spanning multiple lines properly
// ============================================================

async function* streamCsvLines(
  body: ReadableStream<Uint8Array>,
  maxLines?: number
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let lineCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Extract complete lines from buffer
      while (true) {
        // Find next newline not inside quotes
        let inQuotes = false;
        let newlineIdx = -1;
        for (let i = 0; i < buffer.length; i++) {
          const ch = buffer[i];
          if (ch === '"') {
            if (inQuotes && buffer[i + 1] === '"') {
              i++; // skip escaped quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
            newlineIdx = i;
            break;
          }
        }

        if (newlineIdx === -1) break; // no complete line yet

        const line = buffer.substring(0, newlineIdx).trim();
        // Skip \r\n
        if (buffer[newlineIdx] === "\r" && buffer[newlineIdx + 1] === "\n") {
          buffer = buffer.substring(newlineIdx + 2);
        } else {
          buffer = buffer.substring(newlineIdx + 1);
        }

        if (line.length > 0) {
          yield line;
          lineCount++;
          if (maxLines && lineCount >= maxLines) {
            reader.cancel();
            return;
          }
        }
      }
    }

    // Flush remaining buffer
    const remaining = buffer.trim();
    if (remaining.length > 0 && (!maxLines || lineCount < maxLines)) {
      yield remaining;
    }
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

// ============================================================
// Parse a CSV line into a row object using headers
// ============================================================

function lineToRow(line: string, headers: string[], delimiter: string): Record<string, string> {
  const fields = parseCsvLine(line, delimiter);
  const row: Record<string, string> = {};
  headers.forEach((h, idx) => {
    row[h] = fields[idx] ?? "";
  });
  return row;
}

// ============================================================
// Rules Engine (v2 — section-based, with find_replace, price_adjustment, regex)
// ============================================================

// Migrate legacy flat rule to section-based format
function migrateRule(rule: TransformationRule): TransformationRule {
  if (rule.sections && rule.sections.length > 0) return rule;
  return {
    ...rule,
    is_active: rule.is_active !== false,
    sections: [{
      source_field: rule.source_field || "",
      condition: rule.condition || "equals",
      condition_value: rule.condition_value || "",
      target_field: rule.target_field || "",
      target_value: rule.target_value ?? "",
      expression: rule.expression || "",
    }],
    options: rule.options || { case_sensitive: false, use_regex: false },
  };
}

function matchesCondition(
  value: string,
  condition: string | undefined,
  conditionValue: string | undefined,
  options?: { case_sensitive?: boolean; use_regex?: boolean }
): boolean {
  const v = (value ?? "").toString();
  const cv = (conditionValue ?? "").toString();
  const caseSensitive = options?.case_sensitive || false;

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

function evaluateExpression(expr: string, row: Record<string, any>): number {
  let evalExpr = expr;
  const fieldNames = Object.keys(row).sort((a, b) => b.length - a.length);
  for (const key of fieldNames) {
    const numVal = parseFloat(String(row[key]).replace(",", ".")) || 0;
    evalExpr = evalExpr.replace(new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), String(numVal));
  }
  if (!/^[\d\s+\-*/().]+$/.test(evalExpr)) {
    throw new Error(`Invalid expression: ${expr} → ${evalExpr}`);
  }
  return Function(`"use strict"; return (${evalExpr})`)() as number;
}

function applyPriceAdjustment(currentPrice: number, section: RuleSection): number {
  const adjustVal = parseFloat(String(section.adjustment_value ?? "0").replace(",", ".")) || 0;
  switch (section.adjustment_type) {
    case "multiply": return currentPrice * adjustVal;
    case "add_percent": return currentPrice * (1 + adjustVal / 100);
    case "subtract_percent": return currentPrice * (1 - adjustVal / 100);
    case "add_fixed": return currentPrice + adjustVal;
    case "subtract_fixed": return currentPrice - adjustVal;
    case "round_up": return Math.ceil(currentPrice);
    default: return currentPrice;
  }
}

function applyFindReplace(
  value: string,
  replacements: Array<{ find: string; replace: string }>,
  options?: { case_sensitive?: boolean; use_regex?: boolean }
): string {
  let result = value;
  for (const pair of replacements) {
    if (!pair.find) continue;
    if (options?.use_regex) {
      try {
        const re = new RegExp(pair.find, options.case_sensitive ? "g" : "gi");
        result = result.replace(re, pair.replace || "");
      } catch { /* skip bad regex */ }
    } else {
      const escaped = pair.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const flags = options?.case_sensitive ? "g" : "gi";
      result = result.replace(new RegExp(escaped, flags), pair.replace || "");
    }
  }
  return result;
}

function applyRules(
  row: Record<string, string>,
  rules: TransformationRule[]
): { transformed: Record<string, any>; excluded: boolean; excludeReason?: string } {
  const result: Record<string, any> = { ...row };
  let excluded = false;
  let excludeReason: string | undefined;

  // Migrate and sort rules
  const migrated = rules.map(migrateRule);
  const sorted = [...migrated].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (excluded) break;
    if (rule.is_active === false) continue;

    const sections = rule.sections || [];
    const options = rule.options || {};

    for (const section of sections) {
      if (excluded) break;

      const sourceValue = (result[section.source_field] ?? "").toString();
      const isStatic = rule.type === "static";
      const conditionMet = isStatic || matchesCondition(sourceValue, section.condition, section.condition_value, options);

      if (!conditionMet) continue;

      switch (rule.type) {
        case "value_map":
          if (section.target_field) result[section.target_field] = section.target_value;
          break;

        case "find_replace":
          if (section.replacements && section.replacements.length > 0) {
            const targetField = section.target_field || section.source_field;
            const fieldValue = (result[targetField] ?? sourceValue).toString();
            result[targetField] = applyFindReplace(fieldValue, section.replacements, options);
          }
          break;

        case "calculation":
          if (section.expression && section.target_field) {
            try {
              result[section.target_field] = evaluateExpression(section.expression, result);
            } catch (e) {
              console.warn(`[FeedSync] Calculation error for rule ${rule.id}:`, e);
            }
          }
          break;

        case "static":
          if (section.target_field) result[section.target_field] = section.target_value;
          break;

        case "exclude":
          excluded = true;
          excludeReason = `${section.source_field} ${section.condition} "${section.condition_value}"`;
          break;

        case "price_adjustment": {
          const priceField = section.target_field || "price";
          const currentPrice = parseFloat(String(result[priceField] ?? result.price ?? result.retail_price ?? "0").replace(",", ".")) || 0;
          result[priceField] = applyPriceAdjustment(currentPrice, section);
          break;
        }
      }
    }
  }

  return { transformed: result, excluded, excludeReason };
}

// Apply category mappings
function applyCategoryMappings(
  row: Record<string, any>,
  mappings: CategoryMapping[]
): Record<string, any> {
  if (!mappings || mappings.length === 0) return row;

  const sorted = [...mappings].sort((a, b) => a.priority - b.priority);

  for (const mapping of sorted) {
    const val = (row[mapping.source_field] ?? "").toString().toLowerCase();
    const cv = (mapping.match_value ?? "").toLowerCase();
    let matches = false;

    switch (mapping.condition) {
      case "contains": matches = val.includes(cv); break;
      case "equals": matches = val === cv; break;
      case "starts_with": matches = val.startsWith(cv); break;
      case "ends_with": matches = val.endsWith(cv); break;
      case "matches_regex":
        try { matches = new RegExp(cv, "i").test(val); }
        catch { matches = false; }
        break;
      default: matches = val.includes(cv);
    }

    if (matches) {
      const catLabel = mapping.bol_category === "custom"
        ? mapping.custom_category || ""
        : mapping.bol_category || "";
      if (catLabel) row.category = catLabel;
      break; // first match wins
    }
  }

  return row;
}

// ============================================================
// Hash for change detection
// ============================================================

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("MD5", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// Slug generator
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}

// ============================================================
// Image helper
// ============================================================

function buildImageJson(urlStr: string): any {
  const urls = urlStr.split(",").map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) return null;
  return { url: urls[0], alt: "" };
}

// ============================================================
// Action: testUrl (streaming — counts lines without loading all)
// ============================================================

async function testUrl(feedUrl: string): Promise<{ success: boolean; rowCount?: number; error?: string }> {
  try {
    const resp = await fetch(feedUrl, { signal: AbortSignal.timeout(60000) });
    if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };
    if (!resp.body) return { success: false, error: "No response body" };

    // Stream and count newlines
    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let lineCount = 0;
    let inQuotes = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "\n" && !inQuotes) lineCount++;
      }
    }

    return { success: true, rowCount: Math.max(0, lineCount) }; // header is one of those lines, data rows = lineCount (or lineCount-1 if file has trailing newline)
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// Action: previewFeed (streaming — only reads first 25 lines)
// ============================================================

async function previewFeed(
  feedUrl: string,
  delimiter = ",",
  _encoding = "utf-8",
  hasHeader = true
): Promise<{ headers: string[]; sampleRows: Record<string, string>[]; totalEstimate: number }> {
  const countResp = await fetch(feedUrl, { signal: AbortSignal.timeout(60000) });
  if (!countResp.ok) throw new Error(`Failed to fetch: HTTP ${countResp.status}`);

  // Read first ~25 lines to get headers + sample data
  const lines: string[] = [];
  const reader = countResp.body!.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let inQuotes = false;
  let gotEnough = false;

  while (!gotEnough) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    // Extract complete lines
    while (true) {
      let newlineIdx = -1;
      let qState = inQuotes;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i];
        if (ch === '"') {
          if (qState && buffer[i + 1] === '"') {
            i++;
          } else {
            qState = !qState;
          }
        } else if (ch === "\n" && !qState) {
          newlineIdx = i;
          inQuotes = false; // reset for next line
          break;
        }
      }

      if (newlineIdx === -1) break;

      const line = buffer.substring(0, newlineIdx).replace(/\r$/, "").trim();
      buffer = buffer.substring(newlineIdx + 1);

      if (line.length > 0) {
        lines.push(line);
        if (lines.length >= 25) {
          gotEnough = true;
          break;
        }
      }
    }
  }

  // Cancel the stream — we don't need the rest
  try { reader.cancel(); } catch { /* ok */ }

  // Parse the lines we collected (totalEstimate = -1 means "use testUrl for accurate count")
  const headers = hasHeader ? parseCsvLine(lines[0], delimiter) : [];
  const dataStart = hasHeader ? 1 : 0;
  const sampleRows: Record<string, string>[] = [];

  for (let i = dataStart; i < lines.length && sampleRows.length < 20; i++) {
    const fields = parseCsvLine(lines[i], delimiter);
    if (hasHeader) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = fields[idx] ?? "";
      });
      sampleRows.push(row);
    } else {
      const row: Record<string, string> = {};
      fields.forEach((f, idx) => {
        row[`col_${idx}`] = f;
      });
      sampleRows.push(row);
    }
  }

  return { headers, sampleRows, totalEstimate: sampleRows.length };
}

// ============================================================
// Action: syncFeed (streaming pipeline — processes in batches)
// ============================================================

async function syncFeed(
  supabase: any,
  feedId: string,
  triggeredBy = "manual"
): Promise<{
  success: boolean;
  summary: Record<string, number>;
  error?: string;
}> {
  // 1. Load feed config
  const { data: feed, error: feedErr } = await supabase
    .from("product_feeds")
    .select("*")
    .eq("id", feedId)
    .single();

  if (feedErr || !feed) {
    return { success: false, summary: {}, error: `Feed not found: ${feedErr?.message}` };
  }

  const companyId = feed.company_id;
  const fieldMapping: Record<string, string> = feed.field_mapping || {};
  let rules: TransformationRule[] = feed.transformation_rules || [];
  const categoryMappings: CategoryMapping[] = feed.category_mappings || [];
  const bolcomDefaults = feed.bolcom_defaults || {};
  const delimiter = feed.delimiter || ",";
  const hasHeader = feed.has_header_row !== false;

  // Load master rules if linked — they execute BEFORE feed-specific rules
  if (feed.master_rule_group_id) {
    const { data: masterGroup } = await supabase
      .from("product_feed_master_rules")
      .select("rules, is_active")
      .eq("id", feed.master_rule_group_id)
      .single();

    if (masterGroup?.is_active && masterGroup.rules?.length > 0) {
      // Prepend master rules (lower priority = execute first)
      const masterRules: TransformationRule[] = masterGroup.rules.map((r: any, i: number) => ({
        ...r,
        priority: -1000 + i, // ensure they run before feed rules
      }));
      rules = [...masterRules, ...rules];
      console.log(`[FeedSync] Loaded ${masterRules.length} master rules from group ${feed.master_rule_group_id}`);
    }
  }

  // 2. Create sync log entry
  const { data: logEntry } = await supabase
    .from("product_feed_sync_log")
    .insert({ feed_id: feedId, company_id: companyId, triggered_by: triggeredBy })
    .select("id")
    .single();

  const logId = logEntry?.id;

  // 3. Update feed status
  await supabase
    .from("product_feeds")
    .update({ last_sync_status: "running", updated_at: new Date().toISOString() })
    .eq("id", feedId);

  const summary = {
    total_rows: 0,
    imported: 0,
    updated: 0,
    excluded: 0,
    unchanged: 0,
    errors: 0,
    offers_pushed: 0,
  };
  const errorDetails: any[] = [];

  try {
    // 4. Reverse the field mapping: { target_field: csv_column }
    const reverseMap: Record<string, string> = {};
    for (const [csvCol, targetField] of Object.entries(fieldMapping)) {
      reverseMap[targetField] = csvCol;
    }

    // 5. Load existing feed items for this feed (for hash comparison)
    const existingHashes = new Map<string, string>(); // ean → hash
    const existingProductIds = new Map<string, string>(); // ean → product_id

    let offset = 0;
    while (true) {
      const { data: items } = await supabase
        .from("product_feed_items")
        .select("source_ean, sync_hash, product_id")
        .eq("feed_id", feedId)
        .range(offset, offset + 999);

      if (!items || items.length === 0) break;
      for (const item of items) {
        if (item.source_ean) {
          existingHashes.set(item.source_ean, item.sync_hash || "");
          if (item.product_id) existingProductIds.set(item.source_ean, item.product_id);
        }
      }
      offset += items.length;
      if (items.length < 1000) break;
    }
    console.log(`[FeedSync] Loaded ${existingHashes.size} existing feed items`);

    // 6. Fetch CSV (streaming)
    console.log(`[FeedSync] Streaming CSV from ${feed.feed_url}`);
    const resp = await fetch(feed.feed_url, { signal: AbortSignal.timeout(300000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching feed`);
    if (!resp.body) throw new Error("No response body");

    // 7. Stream rows, accumulate batches, process
    let headers: string[] = [];
    let isFirstLine = true;
    let batchInsert: Array<{ mapped: Record<string, any>; raw: Record<string, string>; hash: string }> = [];
    let batchUpdate: Array<{ mapped: Record<string, any>; raw: Record<string, string>; hash: string }> = [];
    let batchExcluded: Array<{ raw: Record<string, string>; reason: string }> = [];
    const offersToPush: Array<{ mapped: Record<string, any>; isNew: boolean }> = [];

    for await (const line of streamCsvLines(resp.body)) {
      if (hasHeader && isFirstLine) {
        headers = parseCsvLine(line, delimiter);
        isFirstLine = false;
        console.log(`[FeedSync] Headers (${headers.length} columns): ${headers.slice(0, 5).join(", ")}...`);
        continue;
      }
      isFirstLine = false;

      summary.total_rows++;

      // Parse line into row
      const row = lineToRow(line, headers, delimiter);

      // Apply field mapping
      const mapped: Record<string, any> = {};
      for (const [targetField, csvCol] of Object.entries(reverseMap)) {
        mapped[targetField] = row[csvCol] ?? "";
      }
      // Also keep all raw CSV column values accessible to rules
      for (const [col, val] of Object.entries(row)) {
        if (!mapped[col]) mapped[col] = val;
      }

      // Apply transformation rules
      const { transformed, excluded, excludeReason } = applyRules(mapped, rules);

      // Apply category mappings (after rules, before hash)
      if (categoryMappings.length > 0) {
        applyCategoryMappings(transformed, categoryMappings);
      }

      if (excluded) {
        summary.excluded++;
        batchExcluded.push({ raw: row, reason: excludeReason || "rule" });
        // Flush excluded batch periodically to save feed_items
        if (batchExcluded.length >= BATCH_SIZE) {
          await flushExcluded(supabase, feedId, companyId, batchExcluded);
          batchExcluded = [];
        }
        continue;
      }

      // Compute hash of key fields for change detection
      const hashInput = [
        transformed.ean || "",
        transformed.name || "",
        String(transformed.price ?? transformed.retail_price ?? ""),
        String(transformed.stock ?? transformed.stock_quantity ?? ""),
      ].join("|");
      const hash = await computeHash(hashInput);

      const ean = (transformed.ean || "").toString().trim();
      if (!ean) {
        summary.errors++;
        if (errorDetails.length < 50) errorDetails.push({ ean: "missing", error: "No EAN after mapping" });
        continue;
      }

      const existingHash = existingHashes.get(ean);

      if (existingHash === undefined) {
        // New product
        batchInsert.push({ mapped: transformed, raw: row, hash });
      } else if (existingHash !== hash) {
        // Changed product
        batchUpdate.push({ mapped: transformed, raw: row, hash });
      } else {
        // Unchanged
        summary.unchanged++;
      }

      // Process insert batch when full
      if (batchInsert.length >= BATCH_SIZE) {
        const result = await processInsertBatch(supabase, feedId, companyId, batchInsert, errorDetails);
        summary.imported += result.imported;
        summary.errors += result.errors;
        if (feed.auto_push_offers) {
          for (const item of batchInsert) offersToPush.push({ mapped: item.mapped, isNew: true });
        }
        batchInsert = [];
      }

      // Process update batch when full
      if (batchUpdate.length >= BATCH_SIZE) {
        const result = await processUpdateBatch(supabase, feedId, companyId, batchUpdate, existingProductIds, errorDetails);
        summary.updated += result.updated;
        summary.errors += result.errors;
        if (feed.auto_push_offers) {
          for (const item of batchUpdate) offersToPush.push({ mapped: item.mapped, isNew: false });
        }
        batchUpdate = [];
      }
    }

    // Flush remaining batches
    if (batchInsert.length > 0) {
      const result = await processInsertBatch(supabase, feedId, companyId, batchInsert, errorDetails);
      summary.imported += result.imported;
      summary.errors += result.errors;
      if (feed.auto_push_offers) {
        for (const item of batchInsert) offersToPush.push({ mapped: item.mapped, isNew: true });
      }
    }
    if (batchUpdate.length > 0) {
      const result = await processUpdateBatch(supabase, feedId, companyId, batchUpdate, existingProductIds, errorDetails);
      summary.updated += result.updated;
      summary.errors += result.errors;
      if (feed.auto_push_offers) {
        for (const item of batchUpdate) offersToPush.push({ mapped: item.mapped, isNew: false });
      }
    }
    if (batchExcluded.length > 0) {
      await flushExcluded(supabase, feedId, companyId, batchExcluded);
    }

    console.log(`[FeedSync] Parsed ${summary.total_rows} rows. Insert: ${summary.imported}, Update: ${summary.updated}, Unchanged: ${summary.unchanged}, Excluded: ${summary.excluded}`);

    // 8. Push offers to bol.com if auto_push is enabled
    if (feed.auto_push_offers && offersToPush.length > 0) {
      console.log(`[FeedSync] Auto-push: ${offersToPush.length} offers to push`);
      const pushCount = await pushOffersToBolcom(supabase, companyId, offersToPush.slice(0, 500), bolcomDefaults);
      summary.offers_pushed = pushCount;
    }

    // 9. Update sync log + feed stats
    const finalStatus = summary.errors > 0 && summary.imported === 0 ? "failed" :
                        summary.errors > 0 ? "partial" : "success";

    if (logId) {
      await supabase
        .from("product_feed_sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: finalStatus,
          total_rows: summary.total_rows,
          imported: summary.imported,
          updated: summary.updated,
          excluded: summary.excluded,
          unchanged: summary.unchanged,
          errors: summary.errors,
          offers_pushed: summary.offers_pushed,
          error_details: errorDetails.slice(0, 50),
        })
        .eq("id", logId);
    }

    await supabase
      .from("product_feeds")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: finalStatus,
        last_sync_summary: summary,
        total_items: summary.total_rows - summary.excluded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedId);

    console.log(`[FeedSync] Complete:`, summary);
    return { success: true, summary };

  } catch (e: any) {
    console.error(`[FeedSync] Fatal error:`, e);

    if (logId) {
      await supabase
        .from("product_feed_sync_log")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_details: [{ error: e.message }],
        })
        .eq("id", logId);
    }

    await supabase
      .from("product_feeds")
      .update({
        last_sync_status: "failed",
        last_sync_summary: { error: e.message },
        updated_at: new Date().toISOString(),
      })
      .eq("id", feedId);

    return { success: false, summary, error: e.message };
  }
}

// ============================================================
// Batch processors (extracted for streaming pipeline)
// ============================================================

async function processInsertBatch(
  supabase: any,
  feedId: string,
  companyId: string,
  batch: Array<{ mapped: Record<string, any>; raw: Record<string, string>; hash: string }>,
  errorDetails: any[]
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;

  const productRows = batch.map((item) => {
    const m = item.mapped;
    const ean = (m.ean || "").toString().trim();
    const name = (m.name || `Product ${ean}`).toString().substring(0, 255);
    const price = parseFloat(String(m.price ?? m.retail_price ?? "0").replace(",", ".")) || 0;

    return {
      company_id: companyId,
      name,
      slug: slugify(`${name}-${ean}`),
      type: "physical",
      status: "published",
      ean,
      sku: (m.sku || "").toString().substring(0, 100) || null,
      price,
      description: (m.description || "").toString() || null,
      short_description: (m.short_description || "").toString().substring(0, 1000) || null,
      category: (m.category || "").toString() || null,
      tags: m.brand ? [m.brand.toString()] : null,
      featured_image: m.image_url ? buildImageJson(m.image_url.toString()) : null,
    };
  });

  const { data: inserted, error: insErr } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "company_id,slug", ignoreDuplicates: false })
    .select("id, ean");

  if (insErr) {
    console.error(`[FeedSync] Insert batch error:`, insErr.message);
    errors += batch.length;
    if (errorDetails.length < 50) errorDetails.push({ error: insErr.message });
    return { imported, errors };
  }

  if (inserted) {
    const insertedMap = new Map<string, string>();
    for (const p of inserted) {
      if (p.ean) insertedMap.set(p.ean, p.id);
    }

    const physicalRows: any[] = [];
    const feedItemRows: any[] = [];
    const offerMappingRows: any[] = [];
    const channelRows: any[] = [];

    for (const item of batch) {
      const ean = (item.mapped.ean || "").toString().trim();
      const productId = insertedMap.get(ean);
      if (!productId) continue;

      const m = item.mapped;
      const stockQty = parseInt(String(m.stock ?? m.stock_quantity ?? "0")) || 0;
      const wholesalePrice = parseFloat(String(m.wholesale_price ?? "0").replace(",", ".")) || 0;
      const retailPrice = parseFloat(String(m.price ?? m.retail_price ?? "0").replace(",", ".")) || 0;

      physicalRows.push({
        product_id: productId,
        sku: (m.sku || ean).toString().substring(0, 100),
        barcode: ean,
        inventory: { quantity: stockQty, source: "feed" },
        pricing: { wholesale: wholesalePrice, retail: retailPrice },
      });

      feedItemRows.push({
        feed_id: feedId,
        product_id: productId,
        company_id: companyId,
        source_ean: ean,
        source_sku: (m.sku || "").toString() || null,
        raw_data: item.raw,
        transformed_data: item.mapped,
        sync_hash: item.hash,
        last_seen_at: new Date().toISOString(),
      });

      offerMappingRows.push({
        company_id: companyId,
        product_id: productId,
        ean,
        is_active: true,
        bolcom_stock_amount: stockQty,
        last_synced_at: new Date().toISOString(),
      });

      channelRows.push({
        company_id: companyId,
        product_id: productId,
        channel: "bolcom",
        is_active: true,
      });
    }

    if (physicalRows.length > 0) {
      await supabase.from("physical_products").upsert(physicalRows, { onConflict: "product_id" });
    }
    if (feedItemRows.length > 0) {
      await supabase.from("product_feed_items").upsert(feedItemRows, { onConflict: "feed_id,source_ean" });
    }
    if (offerMappingRows.length > 0) {
      await supabase.from("bolcom_offer_mappings").upsert(offerMappingRows, { onConflict: "company_id,ean" });
    }
    if (channelRows.length > 0) {
      await supabase.from("product_sales_channels").upsert(channelRows, { onConflict: "company_id,product_id,channel" });
    }

    imported += inserted.length;
  }

  return { imported, errors };
}

async function processUpdateBatch(
  supabase: any,
  feedId: string,
  companyId: string,
  batch: Array<{ mapped: Record<string, any>; raw: Record<string, string>; hash: string }>,
  existingProductIds: Map<string, string>,
  errorDetails: any[]
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  for (const item of batch) {
    const ean = (item.mapped.ean || "").toString().trim();
    const productId = existingProductIds.get(ean);
    if (!productId) {
      errors++;
      continue;
    }

    const m = item.mapped;
    const price = parseFloat(String(m.price ?? m.retail_price ?? "0").replace(",", ".")) || 0;
    const stockQty = parseInt(String(m.stock ?? m.stock_quantity ?? "0")) || 0;
    const wholesalePrice = parseFloat(String(m.wholesale_price ?? "0").replace(",", ".")) || 0;

    await supabase
      .from("products")
      .update({
        name: (m.name || `Product ${ean}`).toString().substring(0, 255),
        price,
        description: (m.description || "").toString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    await supabase
      .from("physical_products")
      .update({
        inventory: { quantity: stockQty, source: "feed" },
        pricing: { wholesale: wholesalePrice, retail: price },
      })
      .eq("product_id", productId);

    await supabase
      .from("product_feed_items")
      .update({
        raw_data: item.raw,
        transformed_data: item.mapped,
        sync_hash: item.hash,
        last_seen_at: new Date().toISOString(),
      })
      .eq("feed_id", feedId)
      .eq("source_ean", ean);

    await supabase
      .from("bolcom_offer_mappings")
      .update({
        bolcom_stock_amount: stockQty,
        last_synced_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("ean", ean);

    updated++;
  }

  return { updated, errors };
}

async function flushExcluded(
  supabase: any,
  feedId: string,
  companyId: string,
  batch: Array<{ raw: Record<string, string>; reason: string }>
): Promise<void> {
  const rows = batch.map((item) => {
    const ean = (item.raw.ean13leverancier || item.raw.ean || "").toString().trim();
    return {
      feed_id: feedId,
      company_id: companyId,
      source_ean: ean || `excluded_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      raw_data: item.raw,
      is_excluded: true,
      exclude_reason: item.reason,
      last_seen_at: new Date().toISOString(),
    };
  });

  if (rows.length > 0) {
    await supabase.from("product_feed_items").upsert(rows, { onConflict: "feed_id,source_ean" }).then(() => {});
  }
}

async function pushOffersToBolcom(
  supabase: any,
  companyId: string,
  items: Array<{ mapped: Record<string, any>; isNew: boolean }>,
  bolcomDefaults: Record<string, string>
): Promise<number> {
  let pushed = 0;

  for (const item of items) {
    try {
      const m = item.mapped;
      const ean = (m.ean || "").toString().trim();
      const price = parseFloat(String(m.price ?? m.retail_price ?? "0").replace(",", ".")) || 0;
      const stockQty = parseInt(String(m.stock ?? m.stock_quantity ?? "0")) || 0;

      if (price <= 0 || stockQty <= 0) continue;

      const { data: mapping } = await supabase
        .from("bolcom_offer_mappings")
        .select("bolcom_offer_id")
        .eq("company_id", companyId)
        .eq("ean", ean)
        .single();

      const action = mapping?.bolcom_offer_id ? "updateOffer" : "createOffer";
      const payload: any = {
        action,
        companyId,
        ean,
        pricing: { bundlePrices: [{ quantity: 1, unitPrice: price }] },
        stock: { amount: stockQty, managedByRetailer: true },
        fulfilment: {
          method: bolcomDefaults.fulfilment_method || "FBR",
          deliveryCode: bolcomDefaults.delivery_code || "2-3d",
        },
        condition: { name: bolcomDefaults.condition || "NEW" },
      };

      if (action === "updateOffer") {
        payload.offerId = mapping!.bolcom_offer_id;
        payload.updates = { pricing: payload.pricing, stock: payload.stock };
      }

      const bolResp = await fetch(`${SUPABASE_URL}/functions/v1/bolcom-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (bolResp.ok) pushed++;
    } catch (e: any) {
      console.warn(`[FeedSync] bol.com push error:`, e.message);
    }
  }

  return pushed;
}

// ============================================================
// Action: syncAllActive (called by pg_cron)
// ============================================================

async function syncAllActive(supabase: any): Promise<{ synced: string[]; skipped: string[] }> {
  const now = new Date();
  const synced: string[] = [];
  const skipped: string[] = [];

  const { data: feeds } = await supabase
    .from("product_feeds")
    .select("id, name, sync_interval, last_sync_at")
    .eq("is_active", true)
    .neq("sync_interval", "manual");

  if (!feeds) return { synced, skipped };

  const intervalMs: Record<string, number> = {
    "15min": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };

  for (const feed of feeds) {
    const interval = intervalMs[feed.sync_interval] || 3600000;
    const lastSync = feed.last_sync_at ? new Date(feed.last_sync_at).getTime() : 0;
    const elapsed = now.getTime() - lastSync;

    if (elapsed >= interval) {
      console.log(`[FeedSync] Auto-syncing feed "${feed.name}" (${feed.id})`);
      await syncFeed(supabase, feed.id, "cron");
      synced.push(feed.id);
    } else {
      skipped.push(feed.id);
    }
  }

  return { synced, skipped };
}

// ============================================================
// Main handler
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let result: any;

    switch (action) {
      case "testUrl": {
        result = await testUrl(params.feedUrl);
        break;
      }

      case "previewFeed": {
        result = await previewFeed(
          params.feedUrl,
          params.delimiter || ",",
          params.encoding || "utf-8",
          params.hasHeader !== false
        );
        break;
      }

      case "syncFeed": {
        result = await syncFeed(supabase, params.feedId, params.triggeredBy || "manual");
        break;
      }

      case "syncAllActive": {
        result = await syncAllActive(supabase);
        break;
      }

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[FeedSync] Request error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
