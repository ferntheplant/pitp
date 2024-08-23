const LOG_LEVELS = <const>[
  "everything",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];
export type LogLevel = (typeof LOG_LEVELS)[number];

const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

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

function parseDate(str: string | undefined): Date | undefined {
  if (!str) {
    return undefined;
  }
  const asDate = new Date(str);
  if (Number.isNaN(asDate)) {
    throw new Error(`Malformed date string: ${str}`);
  }
  return asDate;
}

function parseLogLevel(str: string): LogLevel {
  // @ts-expect-error
  if (LOG_LEVELS.includes(str)) {
    return str as LogLevel;
  }
  throw new Error(`Malformed log level: ${str}`);
}

type Party = {
  name: string;
  start: Date;
  end?: Date;
  location: string;
  description?: string;
  password: string;
  adminPassword: string;
};

export function makeConfig() {
  const partyConfig: Party = {
    name: parseEnvVarRequired("PARTY_NAME"),
    start: parseDate(parseEnvVarRequired("PARTY_START")) || new Date(), // TODO: this is stupid
    end: parseDate(parseEnvVar("PARTY_END")),
    location: parseEnvVarRequired("PARTY_LOCATION"),
    description: parseEnvVar("PARTY_DESCRIPTION"),
    password: parseEnvVarRequired("PARTY_PASSWORD"),
    adminPassword: parseEnvVarRequired("ADMIN_PASSWORD"),
  };

  const config = <const>{
    SERVICE_NAME: "pitp",
    COOKIE_NAME: `pitp-${kebabCase(partyConfig.name)}`,
    RSVP_COOKIE: `pitp-rsvp-${kebabCase(partyConfig.name)}`,
    VERSION: "0.0.1",
    DEBUG: parseEnvVarRequired("DEBUG").toLowerCase() === "true",
    LOG_LEVEL: parseLogLevel(parseEnvVarRequired("LOG_LEVEL")),
    BUN_ENV: parseEnvVar("BUN_ENV") || "dev",
    PORT: 8080,
    HOSTNAME: parseEnvVar("ADMIN_PASSWORD") || "localhost",
    PARTY: partyConfig,
    REDIS_URL: "",
  };
  Object.freeze(config);
  return config;
}

export type Config = ReturnType<typeof makeConfig>;
