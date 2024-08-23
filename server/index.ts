import HOME_TEMPLATE from "../templates/index.html" with { type: "text" };
import INFO_TEMPLATE from "../templates/info.html" with { type: "text" };
import PASSWORD_TEMPLATE from "../templates/password.html" with {
  type: "text",
};
import RSVP_TEMPLATE from "../templates/rsvp.html" with { type: "text" };

import { type ServeOptions, file } from "bun";
import * as cheerio from "cheerio";

import { type Config, makeConfig } from "./config.ts";
import { buildCookie, parseCookies } from "./cookies.ts";
import { makeDevDb } from "./dev-db.ts";
import { withHtmlLiveReload } from "./hot-reload.ts";
import { type Logger, makeLogger } from "./logger.ts";
import { type Db, makeRedis } from "./prod-db.ts";

const RSVP_KEY = "rsvp";

const PATHS = <const>["/", "/enter-password", "/rsvp"];
type Path = (typeof PATHS)[number];

class ServerError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

type Rsvp = {
  name: string;
  email: string;
  message?: string;
};

function buildPasswordView(badPassword = false) {
  const $password = cheerio.load(PASSWORD_TEMPLATE);
  const passwordView = $password("#password-view");
  if (badPassword) {
    const badPassword = $password("#bad-password");
    passwordView.append(badPassword);
  }
  return passwordView;
}

function parseRsvp(raw: string): Rsvp {
  const asObj = JSON.parse(raw); // TODO: error handling
  return asObj as Rsvp;
}

function encodeRsvp(rsvp: Rsvp): string {
  return JSON.stringify(rsvp);
}

async function buildPartyInfoPage(ctx: Context, hasRsvp: boolean) {
  const $info = cheerio.load(INFO_TEMPLATE);
  const $rsvp = cheerio.load(RSVP_TEMPLATE);
  const partyPage = $info("#party-page");
  const rsvps = (await ctx.db.LRANGE(RSVP_KEY, 0, -1)).map(parseRsvp);
  // TODO: build RSVP divs and append to correct element
  if (hasRsvp) {
    const rsvpReminder = $rsvp("#rsvp-reminder");
    partyPage.append(rsvpReminder);
  } else {
    const rsvpForm = $rsvp("#rsvp-form");
    partyPage.append(rsvpForm);
  }
  return partyPage;
}

async function handleRsvp(ctx: Context, form: FormData) {
  const name = form.get("name");
  const email = form.get("email");
  const message = form.get("message");

  if (
    !name ||
    !email ||
    typeof name !== "string" ||
    typeof email !== "string" ||
    (!!message && typeof message !== "string")
  ) {
    ctx.logger("debug", "Received bad RSVP form: ", { name, email, message });
    // TODO: error handling compatible with htmx form submission
    throw new ServerError(422, "Bad RSVP form content");
  }

  const rsvp: Rsvp = {
    name,
    email,
    message: message || undefined,
  };
  // TODO: validate email
  // TODO: check for email dupes
  await ctx.db.RPUSH(RSVP_KEY, encodeRsvp(rsvp));
}

async function handler(
  ctx: Context,
  pathname: string,
  req: Request,
): Promise<Response> {
  if (!PATHS.includes(pathname as Path)) {
    throw new ServerError(404, "Page not found");
  }
  switch (pathname) {
    case "/": {
      const $index = cheerio.load(HOME_TEMPLATE);
      const cookies = parseCookies(req);
      if (
        cookies[ctx.config.COOKIE_NAME] &&
        cookies[ctx.config.COOKIE_NAME] === ctx.config.PARTY.password
      ) {
        const hasRsvp =
          !!cookies[ctx.config.RSVP_COOKIE] &&
          Boolean(cookies[ctx.config.RSVP_COOKIE]);
        $index("main").html(await buildPartyInfoPage(ctx, hasRsvp));
        return new Response($index.root().html(), {
          headers: {
            "Content-Type": "text/html",
            "Is-Page": "true",
            "Set-Cookie": buildCookie(ctx.config),
          },
        });
      }
      $index("head > title").text(ctx.config.PARTY.name);
      $index("main").html(buildPasswordView());
      return new Response($index.root().html(), {
        headers: {
          "Content-Type": "text/html",
          "Is-Page": "true",
        },
      });
    }
    case "/enter-password": {
      if (req.method !== "POST") {
        throw new ServerError(405, "Method not allowed");
      }
      const form = await req.formData();
      const submittedPassword = form.get("password");
      if (
        !submittedPassword ||
        submittedPassword !== ctx.config.PARTY.password
      ) {
        ctx.logger("debug", "User submitted wrong password");
        const passwordView = buildPasswordView(true);
        return new Response(passwordView.prop("outerHTML"), {
          headers: { "Content-Type": "text/html" },
        });
      }
      const cookies = parseCookies(req);
      const hasRsvp =
        !!cookies[ctx.config.RSVP_COOKIE] &&
        Boolean(cookies[ctx.config.RSVP_COOKIE]);
      return new Response((await buildPartyInfoPage(ctx, hasRsvp)).html(), {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": buildCookie(ctx.config),
        },
      });
    }
    case "/rsvp": {
      if (req.method !== "POST") {
        throw new ServerError(405, "Method not allowed");
      }
      const form = await req.formData();
      // TODO: what happens if the RSVP fails?
      await handleRsvp(ctx, form);
      return new Response((await buildPartyInfoPage(ctx, false)).html(), {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": buildCookie(ctx.config, true),
        },
      });
    }
    default:
      throw new ServerError(404, "Page not found");
  }
}

const serverOptions = (ctx: Context): ServeOptions => ({
  port: ctx.config.PORT,
  hostname: ctx.config.HOSTNAME,
  async fetch(req) {
    const url = new URL(req.url);
    ctx.logger("everything", "Processing request:", url.pathname);
    if (url.pathname.startsWith("/public")) {
      // TODO: make the relative pathnames here more robust
      const asset = file(`./${url.pathname}`);
      if (!(await asset.exists())) {
        throw new ServerError(404, "Asset not found");
      }
      return new Response(asset);
    }
    return await handler(ctx, url.pathname, req);
  },
  error(err) {
    if (err instanceof ServerError) {
      ctx.logger("warn", `[${err.code}] ${err.message}`);
      return new Response(err.message, {
        status: err.code,
      });
    }
    ctx.logger("error", `Unexpexted Error ${err.message}`);
    return new Response(err.message, { status: 500 });
  },
});

type Context = {
  config: Config;
  logger: Logger;
  db: Db;
};

async function startServer() {
  const config = makeConfig();
  const logger = makeLogger(config);
  const db =
    config.BUN_ENV === "prod" ? await makeRedis(config, logger) : makeDevDb();

  const ctx = { config, logger, db };
  const server = Bun.serve(
    config.DEBUG ? withHtmlLiveReload(serverOptions(ctx)) : serverOptions(ctx),
  );

  logger("info", `Server running on ${server.hostname}:${server.port}`);
}

await startServer();
// TODO: server and db shutdown cleanup
