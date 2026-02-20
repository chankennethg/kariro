import { pinoLogger } from 'hono-pino';
import pino from 'pino';
import { env } from './env.js';

const pinoOptions: pino.LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty' },
  }),
};

// Standalone logger for use outside Hono (e.g. worker process)
export const log = pino(pinoOptions);

export function logger() {
  return pinoLogger({ pino: log });
}
