import { type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { type Env } from "@config/env";

/**
 * Every cookie is set here, so none is written without its flags. `Secure` only outside development, or
 * `http://localhost` breaks, and `Lax` because `Strict` drops the cookie on the redirect back from Discord.
 */

export const SESSION_COOKIE = "dash_session";
export const CSRF_COOKIE = "dash_csrf";
export const OAUTH_COOKIE = "dash_oauth";

type AuthCookie = typeof SESSION_COOKIE | typeof CSRF_COOKIE | typeof OAUTH_COOKIE;

const HOST_ONLY = "__Host-";
const OAUTH_COOKIE_MAX_AGE = 600;

function secureFor(env: Env): boolean {
	return env.NODE_ENV !== "development";
}

/** Outside development the browser takes a `__Host-` cookie only from this host, so a subdomain cannot plant one. */
export function cookieName(env: Env, cookie: AuthCookie): string {
	return secureFor(env) ? `${HOST_ONLY}${cookie}` : cookie;
}

export function setSessionCookie(context: Context, env: Env, id: string, maxAgeSeconds: number): void {
	setCookie(context, cookieName(env, SESSION_COOKIE), id, {
		httpOnly: true,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: maxAgeSeconds,
	});
}

/** Deliberately readable: the SPA has to echo it in a header, which is the whole double-submit mechanism. */
export function setCsrfCookie(context: Context, env: Env, secret: string, maxAgeSeconds: number): void {
	setCookie(context, cookieName(env, CSRF_COOKIE), secret, {
		httpOnly: false,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: maxAgeSeconds,
	});
}

/** Holds the in-flight OAuth `state` and PKCE verifier, and is cleared whether the callback succeeds or not. */
export function setOauthCookie(context: Context, env: Env, value: string): void {
	setCookie(context, cookieName(env, OAUTH_COOKIE), value, {
		httpOnly: true,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: OAUTH_COOKIE_MAX_AGE,
	});
}

export function clearAuthCookies(context: Context, env: Env): void {
	for (const cookie of [SESSION_COOKIE, CSRF_COOKIE, OAUTH_COOKIE] as const) {
		deleteCookie(context, cookieName(env, cookie), { path: "/", secure: secureFor(env), sameSite: "Lax" });
	}
}

/** Only the name this environment sets, so an unprefixed copy planted from a subdomain is never read. */
export function readCookie(context: Context, env: Env, cookie: AuthCookie): string | null {
	return getCookie(context, cookieName(env, cookie)) ?? null;
}

/** Either spelling, for a caller that may only narrow what it allows and never widen it. */
export function readAnyCookie(context: Context, cookie: AuthCookie): string | null {
	return getCookie(context, `${HOST_ONLY}${cookie}`) ?? getCookie(context, cookie) ?? null;
}
