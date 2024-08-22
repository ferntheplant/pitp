import HOME_TEMPLATE from "../templates/index.html" with { type: "text" };
import RSVP_TEMPLATE from "../templates/rsvp.html" with { type: "text" };
import INFO_TEMPLATE from "../templates/info.html" with { type: "text" };
import PASSWORD_TEMPLATE from "../templates/password.html" with { type: "text" };
import { file, type ServeOptions } from "bun";
import { withHtmlLiveReload } from './hot-reload.ts'
import { CONFIG } from './config.ts'
import { logger } from './logger.ts'
import * as cheerio from "cheerio";

const PATHS = <const>["/", "enter-password"];
type Path = (typeof PATHS)[number];

class ServerError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

async function handler(
  pathname: string,
  req: Request,
): Promise<Response> {
  if (!PATHS.includes(pathname as Path)) {
    throw new ServerError(404, "Page not found");
  }
  switch (pathname) {
    case "/":
      const $home = cheerio.load(HOME_TEMPLATE)
      const $password = cheerio.load(PASSWORD_TEMPLATE)
      $home("head > title").text(CONFIG.PARTY.name)
      $home("main").html($password.root().html() || '')
      return new Response($home.root().html(), {
        headers: { "Content-Type": "text/html" },
      });
    case "/enter-password":
      if (req.method !== "POST") {
        throw new ServerError(405, "Method not allowed")
      }
      const form = await req.formData()
      const submittedPassword = form.get('password')
      if (!submittedPassword || submittedPassword !== CONFIG.PARTY.password) {
        
      }
      const $info = cheerio.load(INFO_TEMPLATE)
      return new Response($info.root().html(), {
        headers: { "Content-Type": "text/html" },
      });
    default:
      throw new ServerError(404, "Page not found");
  }
}

const serverOptions = (): ServeOptions => ({
  port: CONFIG.PORT,
  hostname: CONFIG.HOSTNAME,
  async fetch(req) {
    const url = new URL(req.url);
    logger("everything", "Processing request:", url.pathname);
    if (url.pathname.startsWith('/public')) {
      // TODO: make the relative pathnames here more robust
      const asset = file(`./${url.pathname}`)
      if (!(await asset.exists())) {
        throw new ServerError(404, "Asset not found")
      }
      return new Response(asset)
    }
    return await handler(url.pathname, req)
  },
  error(err) {
    if (err instanceof ServerError) {
      logger("warn", `[${err.code}] ${err.message}`);
      return new Response(err.message, {
        status: err.code
      });
    }
    logger("error", `Unexpexted Error ${err.message}`)
  },
});

const server = Bun.serve(
  CONFIG.DEBUG ? withHtmlLiveReload(serverOptions()) : serverOptions(),
);

logger("info", `Server running on ${server.hostname}:${server.port}`);

// TODO: server shutdown cleanup
