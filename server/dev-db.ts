import { Database } from "bun:sqlite";
import type { Db } from "./prod-db";

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
    async RPUSH(_: string, value: string) {
      insertQuery.all({ $rsvp: value });
      return 1;
    },
    async LRANGE(_0: string, _1: number, _2: number) {
      const raw = readQuery.all() as { data: string }[];
      return raw.map((item) => item.data);
    },
  };
}
