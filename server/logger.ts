import { CONFIG } from './config.ts'

export type LogLevel = "everything" | "debug" | "info" | "warn" | "error" | "fatal";
const LogPriorities: Record<LogLevel, number> = <const>{
  fatal: -1,
  error: 0,
  warn: 10,
  info: 20,
  debug: 100,
  everything: 1000,
};
Object.freeze(LogPriorities);

export function logger(level: LogLevel, message: string, rest?: unknown): void {
  const givenPriority = LogPriorities[level];
  if (givenPriority <= LogPriorities[CONFIG.LOG_LEVEL]) {
    console.log(
      `${new Date().toISOString()} [${CONFIG.SERVICE_NAME}-${CONFIG.VERSION}] ${level}: ${message}${
        rest ? ` ${JSON.stringify(rest)}` : ""
      }`,
    );
  }
}