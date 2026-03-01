/**
 * Production-safe logger.
 * Wraps console methods so they only output during development.
 * In production builds the calls are effectively no-ops.
 */

const isDev = import.meta.env.DEV;

/* eslint-disable no-console */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
};
