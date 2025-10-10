// Safe logger that works in all environments without import.meta
const logger = {
  info: (message, data = null) => {
    console.log(`ℹ️ ${message}`, data || '');
  },
  
  error: (message, error = null) => {
    console.error(`❌ ${message}`, error || '');
  },
  
  warn: (message, data = null) => {
    console.warn(`⚠️ ${message}`, data || '');
  },
  
  debug: (message, data = null) => {
    console.debug(`🐛 ${message}`, data || '');
  },
  
  clean: (obj) => {
    if (!obj) return obj;
    const cleaned = { ...obj };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken', 'refreshToken'];
    
    Object.keys(cleaned).forEach(key => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        cleaned[key] = '[REDACTED]';
      }
    });
    
    return cleaned;
  }
};

// Export both as default AND as named export to handle all import styles
export default logger;
export { logger };