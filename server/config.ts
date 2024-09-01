const LOG_LEVELS = <const>[
  "everything",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];
export type LogLevel = (typeof LOG_LEVELS)[number];

function parseEnvVar(key: string): string | undefined {
  return Bun.env[key];
}

function parseEnvVarRequired(key: string): string {
  const envVar = Bun.env[key];
  if (!envVar) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return envVar;
}

function parseLogLevel(str: string): LogLevel {
  // @ts-expect-error
  if (LOG_LEVELS.includes(str)) {
    return str as LogLevel;
  }
  throw new Error(`Malformed log level: ${str}`);
}

export function makeConfig() {
  const config = <const>{
    SERVICE_NAME: "pitp",
    VERSION: "0.0.1",
    DEBUG: parseEnvVarRequired("DEBUG").toLowerCase() === "true",
    LOG_LEVEL: parseLogLevel(parseEnvVarRequired("LOG_LEVEL")),
    BUN_ENV: parseEnvVar("BUN_ENV") || "dev",
    PORT: 8080,
    HOSTNAME: parseEnvVar("ADMIN_PASSWORD") || "localhost",
    REDIS_URL: parseEnvVar("REDIS_URL"),
    SECRET: parseEnvVarRequired("SECRET"),
    ADMIN_COOKIE: parseEnvVar("ADMIN_COOKIE") || "pitp-admin",
    ADMIN_PASSWORD: parseEnvVarRequired("ADMIN_PASSWORD"),
  };
  Object.freeze(config);
  return config;
}

export type Config = ReturnType<typeof makeConfig>;
