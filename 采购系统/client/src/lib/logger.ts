/* eslint-disable no-console */

const noop = (): void => {};

type LogMethod = (...args: unknown[]) => void;

interface ScopeLogger {
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  debug: LogMethod;
  success: LogMethod;
  log: LogMethod;
}

const LEVEL_MAP: Record<string, string> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  success: 'log',
};

const createScoped = (namespace: string): ScopeLogger => {
  const result: Partial<ScopeLogger> = { log: noop };
  Object.keys(LEVEL_MAP).forEach((level) => {
    const method = LEVEL_MAP[level];
    result[level as keyof ScopeLogger] = (...args: unknown[]) => {
      const fn = console[method as keyof Console] as LogMethod | undefined;
      if (fn) fn.apply(console, [`[${namespace}]`, ...args]);
    };
  });
  return result as ScopeLogger;
};

const appLogger: ScopeLogger & { for: typeof createScoped } = {
  ...createScoped('app'),
  for: createScoped,
};

export default appLogger;
export { createScoped };
export { appLogger as logger };
export type { ScopeLogger };
