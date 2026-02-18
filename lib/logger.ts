type LogMeta = Record<string, unknown>;

interface Logger {
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
}

function format(level: string, message: string, meta?: LogMeta): string {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger: Logger = {
  info(message, meta) {
    console.info(format('info', message, meta));
  },
  warn(message, meta) {
    console.warn(format('warn', message, meta));
  },
  error(message, meta) {
    console.error(format('error', message, meta));
  },
};
