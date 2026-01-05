/**
 * Validation utilities for forms and data
 */

export const validators = {
  /**
   * Validate email format
   */
  email: (email) => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validate URL format
   */
  url: (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate domain (without protocol)
   */
  domain: (domain) => {
    if (!domain) return false;
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return regex.test(domain);
  },

  /**
   * Validate course difficulty
   */
  courseDifficulty: (difficulty) => {
    return ['beginner', 'intermediate', 'advanced'].includes(difficulty?.toLowerCase());
  },

  /**
   * Validate course category
   */
  courseCategory: (category) => {
    return [
      'fundamentals',
      'machine_learning',
      'deep_learning',
      'nlp',
      'computer_vision',
      'ethics',
      'applications'
    ].includes(category?.toLowerCase());
  },

  /**
   * Sanitize string input
   */
  sanitizeString: (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
  },

  /**
   * Validate number range
   */
  numberInRange: (num, min, max) => {
    const n = parseFloat(num);
    return !isNaN(n) && n >= min && n <= max;
  }
};

export default validators;