/**
 * Auto-Fix Generator
 *
 * Generates code fixes for detected API mismatches.
 * Uses simple string replacement for straightforward fixes
 * and LLM assistance for complex transformations.
 */

import type { APIMismatch, CodeFix } from './types.ts';

/**
 * Generate a fix for a single mismatch
 */
export async function generateFix(
  mismatch: APIMismatch,
  togetherApiKey?: string
): Promise<CodeFix | null> {
  if (!mismatch.auto_fixable || !mismatch.suggested_fix) {
    return null;
  }

  // For simple fixes, return the pre-generated suggestion
  if (mismatch.suggested_fix.confidence >= 0.8) {
    return mismatch.suggested_fix;
  }

  // For complex fixes, use LLM if available
  if (togetherApiKey && mismatch.suggested_fix.confidence < 0.8) {
    try {
      return await generateLLMFix(mismatch, togetherApiKey);
    } catch (error) {
      console.warn('[Fixer] LLM fix generation failed:', error);
      return mismatch.suggested_fix;
    }
  }

  return mismatch.suggested_fix;
}

/**
 * Generate fixes for multiple mismatches
 */
export async function generateFixes(
  mismatches: APIMismatch[],
  togetherApiKey?: string
): Promise<Map<string, CodeFix>> {
  const fixes = new Map<string, CodeFix>();

  for (const mismatch of mismatches) {
    if (!mismatch.auto_fixable) continue;

    const fix = await generateFix(mismatch, togetherApiKey);
    if (fix) {
      fixes.set(mismatch.id, fix);
    }
  }

  return fixes;
}

/**
 * Use LLM to generate a more sophisticated fix
 */
async function generateLLMFix(
  mismatch: APIMismatch,
  apiKey: string
): Promise<CodeFix> {
  const prompt = `You are an expert TypeScript/Deno code fixer. Fix this API call according to the new API specification.

PROBLEM: ${mismatch.description}

TYPE: ${mismatch.type}

ORIGINAL CODE:
\`\`\`typescript
${mismatch.implementation.raw_code}
\`\`\`

${mismatch.expected ? `NEW API SPECIFICATION:\n${JSON.stringify(mismatch.expected, null, 2)}` : ''}

INSTRUCTIONS:
1. Update the code to match the new API specification
2. Keep the same logic and variable names where possible
3. Only change what's necessary to fix the mismatch
4. Preserve all error handling and logging

OUTPUT: Return ONLY the fixed code block, no explanations.`;

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract code from response
  const codeMatch = content.match(/```(?:typescript|javascript)?\n([\s\S]*?)\n```/);
  const fixedCode = codeMatch ? codeMatch[1] : content.trim();

  // Validate the fix makes sense
  if (fixedCode.length < 10 || fixedCode === mismatch.implementation.raw_code) {
    // LLM didn't produce a useful fix, fall back to simple fix
    return mismatch.suggested_fix!;
  }

  return {
    file_path: mismatch.implementation.file_path,
    line_start: mismatch.implementation.line_number,
    line_end: mismatch.implementation.line_number + countLines(mismatch.implementation.raw_code) - 1,
    original_code: mismatch.implementation.raw_code,
    fixed_code: fixedCode,
    diff: generateUnifiedDiff(
      mismatch.implementation.raw_code,
      fixedCode,
      mismatch.implementation.file_path
    ),
    confidence: 0.75, // LLM fixes have lower confidence
    requires_manual_review: true,
    description: `LLM-generated fix for ${mismatch.type}: ${mismatch.description}`,
  };
}

/**
 * Apply a fix to file content
 */
export function applyFix(fileContent: string, fix: CodeFix): string {
  const lines = fileContent.split('\n');
  const startIndex = fix.line_start - 1;
  const endIndex = fix.line_end;

  // Extract the original code section
  const originalSection = lines.slice(startIndex, endIndex).join('\n');

  // Verify the original code matches what we expect
  if (!originalSection.includes(fix.original_code.split('\n')[0])) {
    console.warn('[Fixer] Original code mismatch - fix may be outdated');
    // Try to find the original code elsewhere in the file
    const foundIndex = fileContent.indexOf(fix.original_code);
    if (foundIndex !== -1) {
      return fileContent.replace(fix.original_code, fix.fixed_code);
    }
    return fileContent; // Don't modify if we can't find the code
  }

  // Replace the section
  const fixedLines = fix.fixed_code.split('\n');
  lines.splice(startIndex, endIndex - startIndex, ...fixedLines);

  return lines.join('\n');
}

/**
 * Apply multiple fixes to a file
 * Fixes are applied in reverse line order to preserve line numbers
 */
export function applyFixes(fileContent: string, fixes: CodeFix[]): string {
  // Sort fixes by line number (descending) to apply from bottom to top
  const sortedFixes = [...fixes].sort((a, b) => b.line_start - a.line_start);

  let result = fileContent;
  for (const fix of sortedFixes) {
    result = applyFix(result, fix);
  }

  return result;
}

/**
 * Generate unified diff format
 */
function generateUnifiedDiff(
  original: string,
  modified: string,
  filename: string
): string {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  let diff = `--- a/${filename}\n+++ b/${filename}\n@@ -1,${origLines.length} +1,${modLines.length} @@\n`;

  // Simple diff - show all changes
  const maxLen = Math.max(origLines.length, modLines.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i];
    const modLine = modLines[i];

    if (origLine === modLine) {
      diff += ` ${origLine || ''}\n`;
    } else {
      if (origLine !== undefined) {
        diff += `-${origLine}\n`;
      }
      if (modLine !== undefined) {
        diff += `+${modLine}\n`;
      }
    }
  }

  return diff;
}

/**
 * Count lines in a string
 */
function countLines(str: string): number {
  return str.split('\n').length;
}

/**
 * Preview all fixes without applying them
 */
export function previewFixes(mismatches: APIMismatch[]): string {
  const fixable = mismatches.filter((m) => m.auto_fixable && m.suggested_fix);

  if (fixable.length === 0) {
    return 'No auto-fixable mismatches found.\n';
  }

  let preview = `\n📝 Fix Preview\n${'='.repeat(50)}\n\n`;
  preview += `${fixable.length} fixes available:\n\n`;

  for (const m of fixable) {
    preview += `📁 ${m.implementation.file_path}:${m.implementation.line_number}\n`;
    preview += `   ${m.description}\n`;
    preview += `   Confidence: ${(m.suggested_fix!.confidence * 100).toFixed(0)}%\n`;
    preview += `\n   Diff:\n`;

    const diffLines = m.suggested_fix!.diff.split('\n');
    for (const line of diffLines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        preview += `   \x1b[32m${line}\x1b[0m\n`; // Green for additions
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        preview += `   \x1b[31m${line}\x1b[0m\n`; // Red for deletions
      } else {
        preview += `   ${line}\n`;
      }
    }

    preview += '\n';
  }

  return preview;
}

/**
 * Generate a summary of all proposed fixes
 */
export function generateFixSummary(fixes: Map<string, CodeFix>): string {
  const byFile = new Map<string, CodeFix[]>();

  for (const fix of fixes.values()) {
    const existing = byFile.get(fix.file_path) || [];
    existing.push(fix);
    byFile.set(fix.file_path, existing);
  }

  let summary = `\n🔧 Fix Summary\n${'='.repeat(50)}\n\n`;
  summary += `Total fixes: ${fixes.size}\n`;
  summary += `Files affected: ${byFile.size}\n\n`;

  for (const [file, fileFixes] of byFile) {
    summary += `📁 ${file}\n`;
    for (const fix of fileFixes) {
      summary += `   Line ${fix.line_start}: ${fix.description}\n`;
    }
    summary += '\n';
  }

  const highConfidence = Array.from(fixes.values()).filter((f) => f.confidence >= 0.8);
  const lowConfidence = Array.from(fixes.values()).filter((f) => f.confidence < 0.8);

  summary += `\nConfidence breakdown:\n`;
  summary += `  High confidence (≥80%): ${highConfidence.length}\n`;
  summary += `  Low confidence (<80%): ${lowConfidence.length} (manual review recommended)\n`;

  return summary;
}
