/** Minimal structured (JSON lines) logger. */
type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level =
  process.env.NODE_ENV === 'test'
    ? 'error'
    : process.env.NODE_ENV === 'production'
      ? 'info'
      : 'debug';

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (order[level] < order[minLevel]) return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.info(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
};
