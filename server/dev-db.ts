import { Database } from "bun:sqlite";
import { type Db, type Rsvp, encodeRsvp, parseRsvp } from "./db";

const RSVP_TABLE_NAME = "rsvp";

export function makeDevDb(): Db {
  const db = new Database("dev.sqlite", { strict: true, create: true });
  const tableQuery = db.query(`
    CREATE TABLE IF NOT EXISTS ${RSVP_TABLE_NAME} (
      data text
    );
  `);
  tableQuery.run();
  const insertQuery = db.prepare(`
    INSERT INTO ${RSVP_TABLE_NAME} (data) VALUES ($rsvp)
  `);
  const readQuery = db.prepare(`
    SELECT data FROM ${RSVP_TABLE_NAME}
  `);
  return {
    async addRsvp(rsvp: Rsvp) {
      insertQuery.all({ $rsvp: encodeRsvp(rsvp) });
    },
    async getRsvps() {
      const raw = readQuery.all() as { data: string }[];
      return raw.map((item) => parseRsvp(item.data));
    },
    close: async () => db.close(),
  };
}
