import { createClient } from "redis";
import type { Config } from "./config";
import type { Logger } from "./logger";

const RSVP_KEY = "rsvp";

export type Rsvp = {
  name: string;
  email: string;
  message?: string;
};

export type Db = {
  addRsvp: (rsvp: Rsvp) => Promise<void>;
  getRsvps: () => Promise<Rsvp[]>;
};

export function parseRsvp(raw: string): Rsvp {
  const asObj = JSON.parse(raw); // TODO: error handling
  return asObj as Rsvp;
}

export function encodeRsvp(rsvp: Rsvp): string {
  return JSON.stringify(rsvp);
}

export async function makeDb(config: Config, logger: Logger): Promise<Db> {
  const client = await createClient({ url: config.REDIS_URL })
    // TODO: on error shutdown server?
    .on("error", (err) => logger("error", "Redis client error:", err))
    .connect();
  async function addRsvp(rsvp: Rsvp) {
    await client.RPUSH(RSVP_KEY, encodeRsvp(rsvp));
  }
  async function getRsvps() {
    const raw = await client.LRANGE(RSVP_KEY, 0, -1);
    return raw.map(parseRsvp);
  }
  return {
    addRsvp,
    getRsvps,
  };
}
