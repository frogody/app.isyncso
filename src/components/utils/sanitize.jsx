/**
 * Security utility functions for input sanitization and validation
 */

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @param {string[]} allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export function sanitizeUrl(url, allowedProtocols = ['http:', 'https:']) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url.trim());
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  return domainRegex.test(domain.trim().toLowerCase());
}

/**
 * Sanitize file for upload
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types
 * @param {number} maxSizeBytes - Max file size in bytes
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export function validateFile(file, allowedTypes = ['application/pdf'], maxSizeBytes = 10 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes.some(type => file.type.includes(type))) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return { valid: false, error: `File size must be less than ${maxMB}MB` };
  }
  
  return { valid: true, error: null };
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if redirect URL is safe (prevent open redirects)
 * @param {string} url - Redirect URL
 * @param {string[]} allowedPaths - Allowed paths (default: internal app pages)
 * @returns {boolean}
 */
export function isSafeRedirect(url, allowedPaths = ['/Dashboard', '/Learn', '/Profile', '/Settings']) {
  if (!url) return false;
  
  // Only allow relative URLs or same origin
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return false;
    }
    
    // Check if path is in allowed list
    return allowedPaths.some(path => parsed.pathname.includes(path));
  } catch {
    // If URL parsing fails, check if it's a relative path
    return allowedPaths.some(path => url.includes(path));
  }
}