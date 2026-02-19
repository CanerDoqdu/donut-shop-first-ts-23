/**
 * Structured JSON logger.
 *
 * Every log line is a single JSON object with:
 *   level, message, timestamp (ISO-8601), service, and optional metadata.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('order created', { orderId, total });
 *   logger.withContext({ requestId }).info('checkout started');
 */

const SERVICE_NAME = 'donut-shop';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

function buildEntry(level: LogLevel, message: string, meta?: LogMeta): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    ...meta,
  };
}

interface Logger {
  debug: (message: string, meta?: LogMeta) => void;
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
  /** Return a child logger that merges extra context into every log line. */
  withContext: (ctx: LogMeta) => Logger;
}

function createLogger(baseCtx: LogMeta = {}): Logger {
  function emit(level: LogLevel, message: string, meta?: LogMeta) {
    const entry = buildEntry(level, message, { ...baseCtx, ...meta });
    const line = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        console.debug(line);
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
    }
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
    withContext(ctx) {
      return createLogger({ ...baseCtx, ...ctx });
    },
  };
}

export const logger: Logger = createLogger();
export type { Logger, LogMeta };
