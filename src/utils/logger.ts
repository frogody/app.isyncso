/**
 * Logger Utility
 * Environment-aware logging with level control and error reporting hooks.
 *
 * - debug/info: silent in production
 * - warn: logs in production (can be silenced via config)
 * - error: ALWAYS logs, even in production
 * - Timestamps included in dev mode
 * - Supports prefix/tag: logger.info('[Onboarding]', 'step complete')
 */

// Vite env type augmentation (safe if vite/client types aren't loaded)
declare global {
  interface ImportMetaEnv {
    PROD: boolean;
    DEV: boolean;
    MODE: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LoggerConfig {
  level: LogLevel;
  silenceWarnInProd: boolean;
}

const config: LoggerConfig = {
  level: 'debug',
  silenceWarnInProd: false,
};

const isProd = (): boolean => {
  try {
    return import.meta.env.PROD === true;
  } catch {
    return false;
  }
};

function getTimestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function shouldLog(level: LogLevel): boolean {
  // Errors always log
  if (level === 'error') return true;

  const prod = isProd();

  // Warn logs in production unless silenced
  if (level === 'warn') {
    return prod ? !config.silenceWarnInProd : true;
  }

  // debug and info are silent in production
  if (prod) return false;

  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.level];
}

function formatArgs(level: LogLevel, args: unknown[]): unknown[] {
  if (isProd()) return args;
  const prefix = `[${getTimestamp()}] [${level.toUpperCase()}]`;
  return [prefix, ...args];
}

/**
 * Stub for error reporting (Sentry, Datadog, etc.).
 * Replace this implementation when integrating a real error reporter.
 */
function reportError(error: unknown, context?: Record<string, unknown>): void {
  // Stub: swap this out for Sentry.captureException(error, { extra: context })
  if (!isProd()) {
    console.error('[reportError]', error, context);
  }
}

function debug(...args: unknown[]): void {
  if (!shouldLog('debug')) return;
  console.log(...formatArgs('debug', args));
}

function info(...args: unknown[]): void {
  if (!shouldLog('info')) return;
  console.log(...formatArgs('info', args));
}

function warn(...args: unknown[]): void {
  if (!shouldLog('warn')) return;
  console.warn(...formatArgs('warn', args));
}

function error(...args: unknown[]): void {
  if (!shouldLog('error')) return;
  console.error(...formatArgs('error', args));
}

/**
 * Dynamically change the minimum log level.
 * Only affects debug/info filtering — error always logs, warn follows its own config.
 */
function setLogLevel(level: LogLevel): void {
  config.level = level;
}

/**
 * Configure whether warnings are silenced in production.
 */
function setSilenceWarnInProd(silent: boolean): void {
  config.silenceWarnInProd = silent;
}

const logger = { debug, info, warn, error, setLogLevel, setSilenceWarnInProd, reportError };

export { logger, debug, info, warn, error, setLogLevel, setSilenceWarnInProd, reportError };
export default logger;
