import { createClient } from "redis";
import type { Config } from "./config";
import type { Logger } from "./logger";

export async function makeRedis(config: Config, logger: Logger): Promise<Db> {
  const client = await createClient({ url: config.REDIS_URL })
    // TODO: on error shutdown server?
    .on("error", (err) => logger("error", "Redis client error:", err))
    .connect();
  return client;
}

export type Db = {
  RPUSH: (key: string, value: string) => Promise<number>;
  LRANGE: (key: string, start: number, end: number) => Promise<string[]>;
};
