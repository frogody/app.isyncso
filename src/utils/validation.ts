/**
 * Input Validation & Sanitization Utilities
 *
 * Security-focused validation for:
 * - Search inputs used in Supabase .or() / .ilike() queries
 * - File uploads (type, size, name)
 * - Supabase filter values
 * - Required field validation
 * - Generic text sanitization
 */

// ---------------------------------------------------------------------------
// sanitizeSearchInput
// ---------------------------------------------------------------------------

/**
 * Strips dangerous characters from search inputs before interpolation
 * into Supabase PostgREST `.or()` or `.ilike()` filter strings.
 *
 * PostgREST `.or()` accepts comma-separated filters. User input containing
 * commas, dots, or parentheses can break out of the intended filter.
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[,()`;'"\\%]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// validateFileUpload
// ---------------------------------------------------------------------------

interface FileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface FileUploadResult {
  valid: boolean;
  error?: string;
}

export function validateFileUpload(
  file: File,
  options: FileUploadOptions = {},
): FileUploadResult {
  const { maxSizeMB = 10, allowedTypes = [] } = options;

  if (!file) return { valid: false, error: 'No file provided' };
  if (file.size === 0) return { valid: false, error: 'File is empty' };

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (allowedTypes.length > 0) {
    const typeMatch = allowedTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        return file.type.startsWith(allowed.slice(0, -1));
      }
      return file.type === allowed;
    });
    if (!typeMatch) {
      return {
        valid: false,
        error: `File type "${file.type || 'unknown'}" not allowed. Accepted: ${allowedTypes.join(', ')}`,
      };
    }
  }

  if (
    file.name.includes('..') ||
    file.name.includes('/') ||
    file.name.includes('\\')
  ) {
    return { valid: false, error: 'Filename contains invalid path characters' };
  }
  if (file.name.includes('\0')) {
    return { valid: false, error: 'Filename contains null bytes' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// sanitizeFilterValue
// ---------------------------------------------------------------------------

export function sanitizeFilterValue(value: string): string {
  if (!value) return '';
  return value
    .trim()
    .replace(/[,()`;'"\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// validateRequiredFields
// ---------------------------------------------------------------------------

interface RequiredFieldsResult {
  valid: boolean;
  missing: string[];
}

export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
): RequiredFieldsResult {
  const missing: string[] = [];
  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null) {
      missing.push(String(field));
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      missing.push(String(field));
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      missing.push(String(field));
      continue;
    }
  }
  return { valid: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// sanitizeTextInput
// ---------------------------------------------------------------------------

export function sanitizeTextInput(
  input: string,
  maxLength: number = 10000,
): string {
  if (!input) return '';
  let sanitized = input
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ');
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed';
  return (
    filename
      .replace(/\0/g, '')
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[^a-zA-Z0-9._\-\s]/g, '_')
      .replace(/[_\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 255) || 'unnamed'
  );
}

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------

export function validateEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------------------------------------------------------------------------
// validatePhoneNumber
// ---------------------------------------------------------------------------

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-.()\u00A0]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned);
}
