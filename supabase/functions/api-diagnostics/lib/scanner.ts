/**
 * Implementation Scanner
 *
 * Scans Supabase Edge Functions to extract information about
 * external API calls including URLs, methods, and fields used.
 */

import type { ImplementationUsage } from './types.ts';
import { identifyAPI, getRegistryEntry, API_REGISTRY } from './registry.ts';

// Base path for edge functions (relative to project root)
const FUNCTIONS_BASE_PATH = 'supabase/functions';

/**
 * Scan all edge functions for external API calls
 */
export async function scanAllEdgeFunctions(): Promise<ImplementationUsage[]> {
  const usages: ImplementationUsage[] = [];

  // Get list of files to scan from registry
  const filesToScan = new Set<string>();
  for (const api of API_REGISTRY) {
    for (const file of api.files) {
      filesToScan.add(file);
    }
  }

  console.log(`[Scanner] Scanning ${filesToScan.size} files`);

  for (const relativePath of filesToScan) {
    const fullPath = `${FUNCTIONS_BASE_PATH}/${relativePath}`;
    try {
      const content = await Deno.readTextFile(fullPath);
      const fileUsages = scanFileContent(content, fullPath);
      usages.push(...fileUsages);
      console.log(`[Scanner] Found ${fileUsages.length} API calls in ${relativePath}`);
    } catch (error) {
      console.warn(`[Scanner] Could not read ${fullPath}:`, error.message);
    }
  }

  return usages;
}

/**
 * Scan a specific API's files
 */
export async function scanAPIFiles(apiId: string): Promise<ImplementationUsage[]> {
  const registry = getRegistryEntry(apiId);
  if (!registry) {
    throw new Error(`Unknown API: ${apiId}`);
  }

  const usages: ImplementationUsage[] = [];

  for (const relativePath of registry.files) {
    const fullPath = `${FUNCTIONS_BASE_PATH}/${relativePath}`;
    try {
      const content = await Deno.readTextFile(fullPath);
      const fileUsages = scanFileContent(content, fullPath, apiId);
      usages.push(...fileUsages);
    } catch (error) {
      console.warn(`[Scanner] Could not read ${fullPath}:`, error.message);
    }
  }

  return usages;
}

/**
 * Scan file content for API calls
 */
export function scanFileContent(
  content: string,
  filePath: string,
  filterApiId?: string
): ImplementationUsage[] {
  const usages: ImplementationUsage[] = [];
  const lines = content.split('\n');

  // Track base URL variable definitions
  const baseUrls = extractBaseUrlDefinitions(content);

  // Pattern 1: Direct fetch with full URL
  // fetch('https://api.explorium.ai/v1/prospects/match', { ... })
  const directFetchPattern = /fetch\s*\(\s*[`'"](https?:\/\/[^`'"]+)[`'"]/g;
  let match;

  while ((match = directFetchPattern.exec(content)) !== null) {
    const url = match[1];
    const apiId = identifyAPI(url);

    if (!apiId || (filterApiId && apiId !== filterApiId)) {
      continue;
    }

    const lineNumber = getLineNumber(content, match.index);
    const context = extractFetchContext(content, match.index);

    usages.push({
      file_path: filePath,
      function_name: extractFunctionName(content, match.index),
      line_number: lineNumber,
      api_id: apiId,
      endpoint_path: extractPathFromUrl(url),
      method: extractMethod(context),
      used_fields: extractFieldsFromContext(content, match.index),
      headers: extractHeadersFromContext(context),
      raw_code: context,
    });
  }

  // Pattern 2: Template literal with variable base URL
  // fetch(`${EXPLORIUM_API_BASE}/prospects/match`, { ... })
  const templateFetchPattern = /fetch\s*\(\s*`\$\{(\w+)\}([^`]+)`/g;

  while ((match = templateFetchPattern.exec(content)) !== null) {
    const baseVarName = match[1];
    const pathPart = match[2];
    const baseUrl = baseUrls[baseVarName];

    if (!baseUrl) {
      continue;
    }

    const fullUrl = baseUrl + pathPart;
    const apiId = identifyAPI(fullUrl);

    if (!apiId || (filterApiId && apiId !== filterApiId)) {
      continue;
    }

    const lineNumber = getLineNumber(content, match.index);
    const context = extractFetchContext(content, match.index);

    usages.push({
      file_path: filePath,
      function_name: extractFunctionName(content, match.index),
      line_number: lineNumber,
      api_id: apiId,
      endpoint_path: pathPart,
      method: extractMethod(context),
      used_fields: extractFieldsFromContext(content, match.index),
      headers: extractHeadersFromContext(context),
      raw_code: context,
    });
  }

  // Pattern 3: Concatenation with variable
  // fetch(EXPLORIUM_API_BASE + '/prospects/match', { ... })
  const concatFetchPattern = /fetch\s*\(\s*(\w+)\s*\+\s*[`'"]([^`'"]+)[`'"]/g;

  while ((match = concatFetchPattern.exec(content)) !== null) {
    const baseVarName = match[1];
    const pathPart = match[2];
    const baseUrl = baseUrls[baseVarName];

    if (!baseUrl) {
      continue;
    }

    const fullUrl = baseUrl + pathPart;
    const apiId = identifyAPI(fullUrl);

    if (!apiId || (filterApiId && apiId !== filterApiId)) {
      continue;
    }

    const lineNumber = getLineNumber(content, match.index);
    const context = extractFetchContext(content, match.index);

    usages.push({
      file_path: filePath,
      function_name: extractFunctionName(content, match.index),
      line_number: lineNumber,
      api_id: apiId,
      endpoint_path: pathPart,
      method: extractMethod(context),
      used_fields: extractFieldsFromContext(content, match.index),
      headers: extractHeadersFromContext(context),
      raw_code: context,
    });
  }

  return usages;
}

/**
 * Extract base URL variable definitions from code
 */
function extractBaseUrlDefinitions(content: string): Record<string, string> {
  const baseUrls: Record<string, string> = {};

  // Pattern: const SOMETHING_URL = 'https://...'
  const urlDefPattern =
    /const\s+(\w+(?:_?(?:BASE|API|URL)\w*)?)\s*=\s*[`'"](https?:\/\/[^`'"]+)[`'"]/gi;
  let match;

  while ((match = urlDefPattern.exec(content)) !== null) {
    baseUrls[match[1]] = match[2];
  }

  return baseUrls;
}

/**
 * Get line number from character index
 */
function getLineNumber(content: string, index: number): number {
  const beforeMatch = content.slice(0, index);
  return beforeMatch.split('\n').length;
}

/**
 * Extract the function name containing the match
 */
function extractFunctionName(content: string, matchIndex: number): string {
  // Look backwards for function/async function/arrow function
  const beforeMatch = content.slice(0, matchIndex);

  // Pattern 1: async function name()
  const funcMatch = beforeMatch.match(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*$/);
  if (funcMatch) {
    return funcMatch[1];
  }

  // Pattern 2: const name = async () =>
  const arrowMatch = beforeMatch.match(
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[^}]*$/
  );
  if (arrowMatch) {
    return arrowMatch[1];
  }

  // Pattern 3: name: async function() or name: () =>
  const methodMatch = beforeMatch.match(/(\w+)\s*:\s*(?:async\s+)?(?:function)?\s*\([^)]*\)\s*(?:=>)?\s*\{[^}]*$/);
  if (methodMatch) {
    return methodMatch[1];
  }

  return 'anonymous';
}

/**
 * Extract path from full URL
 */
function extractPathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}

/**
 * Extract the fetch call context (including options)
 */
function extractFetchContext(content: string, fetchIndex: number): string {
  // Find the start of the fetch call
  let start = fetchIndex;
  while (start > 0 && content[start - 1] !== '\n' && content[start - 1] !== ';') {
    start--;
  }

  // Find the end - look for matching parentheses and semicolon
  let end = fetchIndex;
  let parenDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let stringChar = '';

  while (end < content.length) {
    const char = content[end];

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          end++;
          break;
        }
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      }
    } else {
      if (char === stringChar && content[end - 1] !== '\\') {
        inString = false;
      }
    }

    end++;
  }

  // Include the semicolon if present
  if (content[end] === ';') {
    end++;
  }

  return content.slice(start, end).trim();
}

/**
 * Extract HTTP method from fetch options
 */
function extractMethod(context: string): string {
  // Pattern: method: 'POST' or method: "POST"
  const methodMatch = context.match(/method\s*:\s*[`'"](\w+)[`'"]/i);
  if (methodMatch) {
    return methodMatch[1].toUpperCase();
  }

  // Default to GET if no method specified
  return 'GET';
}

/**
 * Extract field names from request body
 */
function extractFieldsFromContext(content: string, fetchIndex: number): string[] {
  const fields: string[] = [];

  // Look for body: JSON.stringify({ ... })
  const contextEnd = Math.min(content.length, fetchIndex + 2000);
  const nearbyCode = content.slice(fetchIndex, contextEnd);

  // Find JSON.stringify body
  const bodyPattern = /body\s*:\s*JSON\.stringify\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/;
  const bodyMatch = bodyPattern.exec(nearbyCode);

  if (bodyMatch) {
    const objectContent = bodyMatch[1];

    // Extract top-level field names (before colons)
    const fieldPattern = /(\w+)\s*:/g;
    let fieldMatch;

    while ((fieldMatch = fieldPattern.exec(objectContent)) !== null) {
      // Skip common non-field names
      if (!['method', 'headers', 'body', 'mode', 'cache', 'credentials'].includes(fieldMatch[1])) {
        fields.push(fieldMatch[1]);
      }
    }
  }

  return [...new Set(fields)];
}

/**
 * Extract headers from fetch options
 */
function extractHeadersFromContext(context: string): Record<string, string> {
  const headers: Record<string, string> = {};

  // Pattern: headers: { 'Key': 'value', ... }
  const headersMatch = context.match(/headers\s*:\s*\{([^}]+)\}/);
  if (headersMatch) {
    const headersContent = headersMatch[1];

    // Extract key-value pairs
    const kvPattern = /[`'"]?(\w+(?:[-_]\w+)*)[`'"]?\s*:\s*[`'"]?([^`'",}]+)[`'"]?/g;
    let kvMatch;

    while ((kvMatch = kvPattern.exec(headersContent)) !== null) {
      // Skip dynamic values (variables)
      if (!kvMatch[2].includes('${') && !kvMatch[2].match(/^\w+$/)) {
        headers[kvMatch[1]] = kvMatch[2].trim();
      }
    }
  }

  return headers;
}

/**
 * Format usages into a readable report
 */
export function formatUsagesReport(usages: ImplementationUsage[]): string {
  if (usages.length === 0) {
    return 'No API usages found.';
  }

  let report = `Found ${usages.length} API calls:\n\n`;

  const byFile = new Map<string, ImplementationUsage[]>();
  for (const usage of usages) {
    const existing = byFile.get(usage.file_path) || [];
    existing.push(usage);
    byFile.set(usage.file_path, existing);
  }

  for (const [file, fileUsages] of byFile) {
    report += `📁 ${file}\n`;
    for (const usage of fileUsages) {
      report += `   Line ${usage.line_number}: ${usage.method} ${usage.endpoint_path}\n`;
      report += `   Function: ${usage.function_name}\n`;
      if (usage.used_fields.length > 0) {
        report += `   Fields: ${usage.used_fields.join(', ')}\n`;
      }
      report += '\n';
    }
  }

  return report;
}
