import type { Server } from "bun";

import { type Context, serverOptions } from "./app.ts";
import { makeConfig } from "./config.ts";
import { makeDb, makeDevDb } from "./db.ts";
import { withHtmlLiveReload } from "./hot-reload.ts";
import { makeLogger } from "./logger.ts";

const PROJECT_ROOT = process.cwd();

async function startServer() {
  const config = makeConfig();
  const logger = makeLogger(config);
  const db =
    config.BUN_ENV === "prod" ? await makeDb(config, logger) : makeDevDb();
  const party = await db.getPartyConfig();

  const ctx = { project: PROJECT_ROOT, config, logger, db, party };
  const server = Bun.serve(
    config.DEBUG ? withHtmlLiveReload(serverOptions(ctx)) : serverOptions(ctx),
  );

  logger("info", `Server running on ${server.hostname}:${server.port}`);
  return { server, ctx };
}

async function shutdown(server: Server, ctx: Context) {
  ctx.logger("info", "Server shutting down");
  try {
    server.stop();
    await ctx.db.close();
    process.exit(0);
  } catch (err) {
    ctx.logger("fatal", `Unexpected error during shutdown ${err}`);
    process.exit(1);
  }
}

const { server, ctx } = await startServer();

const gracefulShutdown = async () => await shutdown(server, ctx);
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
