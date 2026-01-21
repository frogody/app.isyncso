/**
 * Mismatch Detector
 *
 * Compares crawled API specifications against implementation usages
 * to detect discrepancies like changed endpoints, renamed fields, etc.
 */

import type {
  APIMismatch,
  CrawledAPISpec,
  EndpointSpec,
  FieldSpec,
  ImplementationUsage,
  MismatchSeverity,
  MismatchType,
} from './types.ts';
import {
  getFieldRename,
  getEndpointMigration,
  KNOWN_FIELD_RENAMES,
  KNOWN_ENDPOINT_MIGRATIONS,
} from './registry.ts';

/**
 * Detect mismatches between API specs and implementations
 */
export function detectMismatches(
  crawledSpecs: Map<string, CrawledAPISpec>,
  implementations: ImplementationUsage[]
): APIMismatch[] {
  const mismatches: APIMismatch[] = [];

  for (const impl of implementations) {
    const spec = crawledSpecs.get(impl.api_id);

    // Check 1: Do we have a spec for this API?
    if (!spec) {
      // Check against known migrations even without a crawled spec
      const knownMigration = getEndpointMigration(impl.api_id, impl.endpoint_path);
      if (knownMigration) {
        mismatches.push(createEndpointMismatch(impl, knownMigration, 'critical'));
      }

      // Check known field renames
      for (const field of impl.used_fields) {
        const renamedTo = getFieldRename(impl.api_id, field);
        if (renamedTo) {
          mismatches.push(createFieldRenameMismatch(impl, field, renamedTo, 'critical'));
        }
      }

      continue;
    }

    // Check 2: Does the endpoint exist in the spec?
    const endpointMatch = findMatchingEndpoint(spec, impl);

    if (!endpointMatch) {
      // Endpoint not found - try to find a similar one
      const similar = findSimilarEndpoints(spec, impl.endpoint_path, impl.method);
      const knownMigration = getEndpointMigration(impl.api_id, impl.endpoint_path);

      if (knownMigration) {
        // We have a known migration for this endpoint
        mismatches.push(createEndpointMismatch(impl, knownMigration, 'critical'));
      } else if (similar.length > 0) {
        // Found a similar endpoint - likely a migration
        mismatches.push(createEndpointMismatch(impl, similar[0].path, 'critical'));
      } else {
        // No similar endpoint found
        mismatches.push({
          id: generateId(),
          api_id: impl.api_id,
          severity: 'critical',
          type: 'endpoint_not_found',
          description: `Endpoint ${impl.method} ${impl.endpoint_path} not found in API documentation`,
          implementation: impl,
          expected: null,
          detected_at: new Date().toISOString(),
          auto_fixable: false,
          suggested_fix: null,
          status: 'open',
        });
      }

      continue;
    }

    // Check 3: Is the endpoint deprecated?
    if (endpointMatch.deprecated) {
      mismatches.push({
        id: generateId(),
        api_id: impl.api_id,
        severity: 'warning',
        type: 'endpoint_deprecated',
        description: `Endpoint ${impl.endpoint_path} is deprecated`,
        implementation: impl,
        expected: endpointMatch,
        detected_at: new Date().toISOString(),
        auto_fixable: !!endpointMatch.successor_path,
        suggested_fix: endpointMatch.successor_path
          ? {
              file_path: impl.file_path,
              line_start: impl.line_number,
              line_end: impl.line_number,
              original_code: impl.endpoint_path,
              fixed_code: endpointMatch.successor_path,
              diff: createSimpleDiff(impl.endpoint_path, endpointMatch.successor_path),
              confidence: 0.9,
              requires_manual_review: false,
              description: `Replace deprecated endpoint with ${endpointMatch.successor_path}`,
            }
          : null,
        status: 'open',
      });
    }

    // Check 4: Are all used fields valid?
    for (const usedField of impl.used_fields) {
      // Check known renames first
      const renamedTo = getFieldRename(impl.api_id, usedField);
      if (renamedTo) {
        mismatches.push(createFieldRenameMismatch(impl, usedField, renamedTo, 'critical'));
        continue;
      }

      // Check against crawled schema
      const fieldSpec = findFieldInEndpoint(spec, endpointMatch, usedField);

      if (!fieldSpec) {
        // Field not found - try fuzzy match
        const similarField = findSimilarField(spec, usedField);

        if (similarField) {
          mismatches.push(createFieldRenameMismatch(impl, usedField, similarField.name, 'warning'));
        }
      } else if (fieldSpec.deprecated) {
        mismatches.push({
          id: generateId(),
          api_id: impl.api_id,
          severity: 'warning',
          type: 'field_removed',
          description: `Field '${usedField}' is deprecated`,
          implementation: impl,
          expected: fieldSpec,
          detected_at: new Date().toISOString(),
          auto_fixable: !!fieldSpec.successor_name,
          suggested_fix: fieldSpec.successor_name
            ? {
                file_path: impl.file_path,
                line_start: impl.line_number,
                line_end: impl.line_number,
                original_code: usedField,
                fixed_code: fieldSpec.successor_name,
                diff: createSimpleDiff(usedField, fieldSpec.successor_name),
                confidence: 0.85,
                requires_manual_review: false,
                description: `Replace deprecated field with '${fieldSpec.successor_name}'`,
              }
            : null,
          status: 'open',
        });
      }
    }

    // Check 5: Are all required fields present?
    for (const requiredField of endpointMatch.required_fields) {
      if (!impl.used_fields.includes(requiredField)) {
        mismatches.push({
          id: generateId(),
          api_id: impl.api_id,
          severity: 'warning',
          type: 'field_required_changed',
          description: `Required field '${requiredField}' is not being sent`,
          implementation: impl,
          expected: null,
          detected_at: new Date().toISOString(),
          auto_fixable: false,
          suggested_fix: null,
          status: 'open',
        });
      }
    }
  }

  return mismatches;
}

/**
 * Find matching endpoint in spec
 */
function findMatchingEndpoint(
  spec: CrawledAPISpec,
  impl: ImplementationUsage
): EndpointSpec | null {
  // Normalize paths for comparison
  const implPath = normalizePath(impl.endpoint_path);

  for (const endpoint of spec.endpoints) {
    if (
      endpoint.method.toUpperCase() === impl.method.toUpperCase() &&
      normalizePath(endpoint.path) === implPath
    ) {
      return endpoint;
    }
  }

  return null;
}

/**
 * Find similar endpoints (for suggesting migrations)
 */
function findSimilarEndpoints(
  spec: CrawledAPISpec,
  path: string,
  method: string
): EndpointSpec[] {
  const normalizedPath = normalizePath(path);
  const pathParts = normalizedPath.split('/').filter(Boolean);
  const candidates: Array<{ endpoint: EndpointSpec; score: number }> = [];

  for (const endpoint of spec.endpoints) {
    // Must match method
    if (endpoint.method.toUpperCase() !== method.toUpperCase()) {
      continue;
    }

    const endpointParts = normalizePath(endpoint.path).split('/').filter(Boolean);

    // Calculate similarity score
    let score = 0;

    // Same number of path segments is a good sign
    if (pathParts.length === endpointParts.length) {
      score += 0.3;

      // Count matching segments
      let matchingSegments = 0;
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === endpointParts[i]) {
          matchingSegments++;
        }
      }
      score += (matchingSegments / pathParts.length) * 0.5;
    }

    // Check for common patterns (contacts -> prospects, etc.)
    const commonMigrations = [
      ['contacts', 'prospects'],
      ['users', 'accounts'],
      ['items', 'products'],
    ];

    for (const [oldTerm, newTerm] of commonMigrations) {
      if (path.includes(oldTerm) && endpoint.path.includes(newTerm)) {
        score += 0.3;
        break;
      }
    }

    // String similarity
    score += calculateStringSimilarity(normalizedPath, normalizePath(endpoint.path)) * 0.2;

    if (score > 0.5) {
      candidates.push({ endpoint, score });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .map((c) => c.endpoint);
}

/**
 * Find a field in endpoint's schema
 */
function findFieldInEndpoint(
  spec: CrawledAPISpec,
  _endpoint: EndpointSpec,
  fieldName: string
): FieldSpec | null {
  // Search all schemas for the field
  for (const schema of spec.schemas) {
    for (const field of schema.fields) {
      if (field.name === fieldName || field.name.endsWith(`.${fieldName}`)) {
        return field;
      }
    }
  }

  return null;
}

/**
 * Find similar field (fuzzy match)
 */
function findSimilarField(spec: CrawledAPISpec, fieldName: string): FieldSpec | null {
  let bestMatch: FieldSpec | null = null;
  let bestScore = 0;

  for (const schema of spec.schemas) {
    for (const field of schema.fields) {
      const score = calculateStringSimilarity(fieldName, field.name);

      // Also check for common rename patterns
      if (fieldName.includes('_url') && field.name === fieldName.replace('_url', '')) {
        return field; // Exact match for _url removal pattern
      }

      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = field;
      }
    }
  }

  return bestMatch;
}

/**
 * Create an endpoint mismatch entry
 */
function createEndpointMismatch(
  impl: ImplementationUsage,
  expectedPath: string,
  severity: MismatchSeverity
): APIMismatch {
  return {
    id: generateId(),
    api_id: impl.api_id,
    severity,
    type: 'endpoint_not_found',
    description: `Endpoint ${impl.method} ${impl.endpoint_path} changed to ${expectedPath}`,
    implementation: impl,
    expected: {
      method: impl.method as EndpointSpec['method'],
      path: expectedPath,
      description: '',
      request_body: null,
      response_schema: null,
      required_fields: [],
      optional_fields: [],
      deprecated: false,
    },
    detected_at: new Date().toISOString(),
    auto_fixable: true,
    suggested_fix: {
      file_path: impl.file_path,
      line_start: impl.line_number,
      line_end: impl.line_number,
      original_code: impl.endpoint_path,
      fixed_code: expectedPath,
      diff: createSimpleDiff(impl.endpoint_path, expectedPath),
      confidence: 0.9,
      requires_manual_review: false,
      description: `Replace endpoint path: ${impl.endpoint_path} -> ${expectedPath}`,
    },
    status: 'open',
  };
}

/**
 * Create a field rename mismatch entry
 */
function createFieldRenameMismatch(
  impl: ImplementationUsage,
  oldField: string,
  newField: string,
  severity: MismatchSeverity
): APIMismatch {
  return {
    id: generateId(),
    api_id: impl.api_id,
    severity,
    type: 'field_renamed',
    description: `Field '${oldField}' has been renamed to '${newField}'`,
    implementation: impl,
    expected: {
      name: newField,
      type: 'string',
      required: false,
      description: '',
      example: null,
      deprecated: false,
    },
    detected_at: new Date().toISOString(),
    auto_fixable: true,
    suggested_fix: {
      file_path: impl.file_path,
      line_start: impl.line_number,
      line_end: impl.line_number,
      original_code: oldField,
      fixed_code: newField,
      diff: createSimpleDiff(oldField, newField),
      confidence: 0.85,
      requires_manual_review: false,
      description: `Rename field: ${oldField} -> ${newField}`,
    },
    status: 'open',
  };
}

/**
 * Normalize path for comparison
 */
function normalizePath(path: string): string {
  return path
    .toLowerCase()
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/\/+/g, '/'); // Normalize multiple slashes
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
function calculateStringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Create a simple diff string
 */
function createSimpleDiff(original: string, fixed: string): string {
  return `- ${original}\n+ ${fixed}`;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `mismatch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Format mismatches into a readable report
 */
export function formatMismatchReport(mismatches: APIMismatch[]): string {
  if (mismatches.length === 0) {
    return '✅ No mismatches detected!\n';
  }

  const critical = mismatches.filter((m) => m.severity === 'critical');
  const warnings = mismatches.filter((m) => m.severity === 'warning');
  const info = mismatches.filter((m) => m.severity === 'info');

  let report = `\n🔍 API Mismatch Report\n${'='.repeat(50)}\n\n`;
  report += `Total: ${mismatches.length} issues found\n`;
  report += `  🔴 Critical: ${critical.length}\n`;
  report += `  🟡 Warning: ${warnings.length}\n`;
  report += `  🔵 Info: ${info.length}\n\n`;

  const byFile = new Map<string, APIMismatch[]>();
  for (const m of mismatches) {
    const existing = byFile.get(m.implementation.file_path) || [];
    existing.push(m);
    byFile.set(m.implementation.file_path, existing);
  }

  for (const [file, fileMismatches] of byFile) {
    report += `📁 ${file}\n`;

    for (const m of fileMismatches) {
      const icon = m.severity === 'critical' ? '🔴' : m.severity === 'warning' ? '🟡' : '🔵';
      report += `\n  ${icon} ${m.type} (line ${m.implementation.line_number})\n`;
      report += `     ${m.description}\n`;

      if (m.suggested_fix) {
        report += `     Fix: ${m.suggested_fix.description}\n`;
        report += `     Confidence: ${(m.suggested_fix.confidence * 100).toFixed(0)}%\n`;
      }
    }

    report += '\n';
  }

  return report;
}
