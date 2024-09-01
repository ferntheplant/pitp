import type { Context } from "./app";

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

const BASE_COOKIES = ["HttpOnly", "Max-Age=900000", "SameSite=Strict"];
export function buildCookie(ctx: Context, rsvp = false) {
  const cookies = [...BASE_COOKIES];
  if (ctx.party) {
    cookies.push(`${ctx.party.partyCookie}=${ctx.party.password}`);
    cookies.push(`${ctx.party.rsvpCookie}=${rsvp}`);
  }
  return cookies.join(";");
}

export function buildAdminCookie(ctx: Context) {
  const cookies = [
    ...BASE_COOKIES,
    `${ctx.config.ADMIN_COOKIE}=${ctx.config.SECRET}`,
  ];
  return cookies.join(";");
}
