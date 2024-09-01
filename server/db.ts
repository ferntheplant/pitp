import { Database } from "bun:sqlite";
import { createClient } from "redis";

import type { Config } from "./config";
import type { Logger } from "./logger";

const PARTY_KEY = "party";
const RSVP_KEY = "rsvp";

export type Party = {
  name: string;
  start: Date;
  end?: Date;
  location: string;
  description?: string;
  password: string;
  partyCookie: string;
  rsvpCookie: string;
};

export type Rsvp = {
  name: string;
  email: string;
  message?: string;
};

export type Db = {
  addRsvp: (rsvp: Rsvp) => Promise<void>;
  getRsvps: () => Promise<Rsvp[]>;
  setPartyConfig: (party: Party) => Promise<void>;
  getPartyConfig: () => Promise<Party | null>;
  close: () => Promise<void>;
};

export function parseRsvp(raw: string): Rsvp {
  try {
    const asObj = JSON.parse(raw);
    return asObj as Rsvp;
  } catch (err) {
    throw new Error(`Unexpected error parsing RSVP: ${raw}`);
  }
}

export function encodeRsvp(rsvp: Rsvp): string {
  return JSON.stringify(rsvp);
}

function encodeParty(party: Party): string {
  return JSON.stringify(party);
}

const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

function parseParty(raw: string): Party {
  const asObj = JSON.parse(raw);
  return {
    ...asObj,
    start: new Date(asObj.start),
    end: asObj.end ? new Date(asObj.end) : undefined,
    partyCookie: `pitp-${kebabCase(asObj.name)}-cookie`,
    rsvpCookie: `pitp-rsvp-${kebabCase(asObj.name)}-cookie`,
  };
}

export async function makeDb(config: Config, logger: Logger): Promise<Db> {
  const client = await createClient({ url: config.REDIS_URL })
    .on("error", (err) => logger("error", "Redis client error:", err))
    .connect();
  async function addRsvp(rsvp: Rsvp) {
    await client.RPUSH(RSVP_KEY, encodeRsvp(rsvp));
  }
  async function getRsvps() {
    const raw = await client.LRANGE(RSVP_KEY, 0, -1);
    return raw.map(parseRsvp);
  }
  async function setPartyConfig(party: Party) {
    await client.SET(PARTY_KEY, encodeParty(party));
  }
  async function getPartyConfig() {
    const raw = await client.GET(PARTY_KEY);
    return raw ? parseParty(raw) : null;
  }
  return {
    addRsvp,
    getRsvps,
    setPartyConfig,
    getPartyConfig,
    close: async () => {
      await client.quit();
    },
  };
}

export function makeDevDb(): Db {
  const db = new Database("dev.sqlite", { strict: true, create: true });
  const rsvpTableQuery = db.query(`
    CREATE TABLE IF NOT EXISTS ${RSVP_KEY} (
      data text
    );
  `);
  rsvpTableQuery.run();
  const partyTableQuery = db.query(`
    CREATE TABLE IF NOT EXISTS ${PARTY_KEY} (
      data text
    );
  `);
  partyTableQuery.run();
  const addRsvpQuery = db.prepare(`
    INSERT INTO ${RSVP_KEY} (data) VALUES ($rsvp)
  `);
  const getRsvpQuery = db.prepare(`
    SELECT data FROM ${RSVP_KEY}
  `);
  const setPartyQuery = db.prepare(`
    UPDATE ${PARTY_KEY} SET data = $party
  `);
  const getPartyQuery = db.prepare(`
    SELECT data FROM ${PARTY_KEY}
  `);
  return {
    async addRsvp(rsvp: Rsvp) {
      addRsvpQuery.all({ $rsvp: encodeRsvp(rsvp) });
    },
    async getRsvps() {
      const raw = getRsvpQuery.all() as { data: string }[];
      return raw.map((item) => parseRsvp(item.data));
    },
    async setPartyConfig(party: Party) {
      setPartyQuery.all({ $party: encodeParty(party) });
    },
    async getPartyConfig() {
      const raw = getPartyQuery.all() as { data: string }[];
      if (raw.length === 0) {
        return null;
      }
      return parseParty(raw[0].data);
    },
    close: async () => db.close(),
  };
}
