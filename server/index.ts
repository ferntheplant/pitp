import HOME_TEMPLATE from "../templates/index.html" with { type: "text" };
import INFO_TEMPLATE from "../templates/info.html" with { type: "text" };
import PASSWORD_TEMPLATE from "../templates/password.html" with {
	type: "text",
};
import RSVP_TEMPLATE from "../templates/rsvp.html" with { type: "text" };

import { file, type ServeOptions } from "bun";
import * as cheerio from "cheerio";

import { CONFIG } from "./config.ts";
import { buildCookie, parseCookies } from "./cookies.ts";
import { withHtmlLiveReload } from "./hot-reload.ts";
import { logger } from "./logger.ts";

const PATHS = <const>["/", "/enter-password", "/rsvp"];
type Path = (typeof PATHS)[number];

class ServerError extends Error {
	code: number;
	constructor(code: number, message: string) {
		super(message);
		this.code = code;
	}
}

function buildPasswordView(badPassword = false) {
	const $password = cheerio.load(PASSWORD_TEMPLATE);
	const passwordView = $password("#password-view");
	if (badPassword) {
		const badPassword = $password("#bad-password");
		passwordView.append(badPassword);
	}
	return passwordView;
}

async function buildPartyInfoPage(hasRsvp: boolean) {
	const $info = cheerio.load(INFO_TEMPLATE);
  const $rsvp = cheerio.load(RSVP_TEMPLATE);
	const partyPage = $info("#party-page");
	if (hasRsvp) {
    const rsvpReminder = $rsvp("#rsvp-reminder")
    partyPage.append(rsvpReminder)
	} else {
    const rsvpForm = $rsvp("#rsvp-form");
		partyPage.append(rsvpForm);
  }
	return partyPage;
}

async function handleRsvp(form: FormData) {}

async function handler(pathname: string, req: Request): Promise<Response> {
	if (!PATHS.includes(pathname as Path)) {
		throw new ServerError(404, "Page not found");
	}
	switch (pathname) {
		case "/": {
			const $index = cheerio.load(HOME_TEMPLATE);
			const cookies = parseCookies(req);
			if (
				cookies[CONFIG.COOKIE_NAME] &&
				cookies[CONFIG.COOKIE_NAME] === CONFIG.PARTY.password
			) {
				const hasRsvp =
					!!cookies[CONFIG.RSVP_COOKIE] && Boolean(cookies[CONFIG.RSVP_COOKIE]);
				$index("main").html(await buildPartyInfoPage(hasRsvp));
				return new Response($index.root().html(), {
					headers: {
						"Content-Type": "text/html",
						"Is-Page": "true",
						"Set-Cookie": buildCookie(),
					},
				});
			}
			$index("head > title").text(CONFIG.PARTY.name);
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
			if (!submittedPassword || submittedPassword !== CONFIG.PARTY.password) {
				const passwordView = buildPasswordView(true);
				return new Response(passwordView.prop("outerHTML"), {
					headers: { "Content-Type": "text/html" },
				});
			}
      const cookies = parseCookies(req);
      const hasRsvp = !!cookies[CONFIG.RSVP_COOKIE] && Boolean(cookies[CONFIG.RSVP_COOKIE]);
			return new Response((await buildPartyInfoPage(hasRsvp)).html(), {
				headers: {
					"Content-Type": "text/html",
					"Set-Cookie": buildCookie(),
				},
			});
		}
		case "/rsvp": {
			if (req.method !== "POST") {
				throw new ServerError(405, "Method not allowed");
			}
			const form = await req.formData();
			await handleRsvp(form);
			return new Response((await buildPartyInfoPage(false)).html(), {
				headers: { "Content-Type": "text/html" },
			});
		}
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
		if (url.pathname.startsWith("/public")) {
			// TODO: make the relative pathnames here more robust
			const asset = file(`./${url.pathname}`);
			if (!(await asset.exists())) {
				throw new ServerError(404, "Asset not found");
			}
			return new Response(asset);
		}
		return await handler(url.pathname, req);
	},
	error(err) {
		if (err instanceof ServerError) {
			logger("warn", `[${err.code}] ${err.message}`);
			return new Response(err.message, {
				status: err.code,
			});
		}
		logger("error", `Unexpexted Error ${err.message}`);
		return new Response(err.message, { status: 500 });
	},
});

const server = Bun.serve(
	CONFIG.DEBUG ? withHtmlLiveReload(serverOptions()) : serverOptions(),
);

logger("info", `Server running on ${server.hostname}:${server.port}`);

// TODO: server shutdown cleanup
