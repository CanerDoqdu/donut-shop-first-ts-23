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
 *
 * Metrics (log-based):
 *   logger.metric('checkout_duration_ms', 340, { orderId });
 *   logger.count('checkout_error', { code: 'E_STRIPE_CHECKOUT_FAILED' });
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
  /** Emit a metric data-point as a structured log line. */
  metric: (name: string, value: number, meta?: LogMeta) => void;
  /** Emit a counter increment as a structured log line. */
  count: (name: string, meta?: LogMeta) => void;
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
    metric(name, value, meta) {
      emit('info', `metric.${name}`, { metric: name, value, ...meta });
    },
    count(name, meta) {
      emit('info', `metric.${name}`, { metric: name, value: 1, ...meta });
    },
  };
}

export const logger: Logger = createLogger();
export type { Logger, LogMeta };

// ── Request ID helpers ──────────────────────────────────────

/** Extract x-request-id from a Request, or generate one. */
export function extractRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID();
}

/** Start a timer; call the returned function to get elapsed ms. */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
