import type { Config, LogLevel } from "./config";

const LogPriorities: Record<LogLevel, number> = <const>{
  fatal: -1,
  error: 0,
  warn: 10,
  info: 20,
  debug: 100,
  everything: 1000,
};
Object.freeze(LogPriorities);

export function makeLogger(config: Config) {
  return function logger(
    level: LogLevel,
    message: string,
    rest?: unknown,
  ): void {
    const givenPriority = LogPriorities[level];
    if (givenPriority <= LogPriorities[config.LOG_LEVEL]) {
      console.log(
        `${new Date().toISOString()} [${config.SERVICE_NAME}-${config.VERSION}] ${level}: ${message}${
          rest ? ` ${JSON.stringify(rest)}` : ""
        }`,
      );
    }
  };
}

export type Logger = ReturnType<typeof makeLogger>;
