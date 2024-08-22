import { CONFIG } from "./config";

type Cookie = Record<string, string>;

export function parseCookies(request: Request): Cookie {
	const list: Cookie = {};
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return list;

	for (const cookie of cookieHeader.split(";")) {
		let [name, ...rest] = cookie.split("=");
		name = name?.trim();
		if (!name) continue;
		const value = rest.join("=").trim();
		if (!value) continue;
		list[name] = decodeURIComponent(value);
	}

	return list;
}

export function buildCookie() {
	return [
		`${CONFIG.COOKIE_NAME}=${CONFIG.PARTY.password}`,
		"HttpOnly",
		"Max-Age=900000",
		"SameSite=Strict",
	].join(";");
}
