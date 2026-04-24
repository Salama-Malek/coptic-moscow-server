import pino from 'pino';

// Single app logger. In dev, pretty-print to console; in prod, JSON lines to stdout
// (Hostinger Runtime Logs tab captures these). Headers that could leak secrets are
// redacted at the http-middleware level too, but this adds defence-in-depth.
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-cron-secret"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.current_password',
      '*.new_password',
    ],
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
});
