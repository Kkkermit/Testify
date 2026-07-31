import { type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { type Env } from "@config/env";

/**
 * Every cookie the dashboard sets goes through here, so none can be written without its flags.
 *
 * `Secure` has to be conditional or nothing works on `http://localhost`, which is the single most common
 * self-hosting trip-up. `SameSite=Lax` rather than `Strict`: `Strict` drops the cookie on the redirect back
 * from Discord, and the sign-in silently fails.
 */

export const SESSION_COOKIE = "dash_session";
export const CSRF_COOKIE = "dash_csrf";
export const OAUTH_COOKIE = "dash_oauth";

export const OAUTH_COOKIE_MAX_AGE = 600;

function secureFor(env: Env): boolean {
	return env.NODE_ENV !== "development";
}

export function setSessionCookie(context: Context, env: Env, id: string, maxAgeSeconds: number): void {
	setCookie(context, SESSION_COOKIE, id, {
		httpOnly: true,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: maxAgeSeconds,
	});
}

/** Deliberately readable: the SPA has to echo it in a header, which is the whole double-submit mechanism. */
export function setCsrfCookie(context: Context, env: Env, secret: string, maxAgeSeconds: number): void {
	setCookie(context, CSRF_COOKIE, secret, {
		httpOnly: false,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: maxAgeSeconds,
	});
}

/** Holds the in-flight OAuth `state` and PKCE verifier, and is cleared whether the callback succeeds or not. */
export function setOauthCookie(context: Context, env: Env, value: string): void {
	setCookie(context, OAUTH_COOKIE, value, {
		httpOnly: true,
		secure: secureFor(env),
		sameSite: "Lax",
		path: "/",
		maxAge: OAUTH_COOKIE_MAX_AGE,
	});
}

export function clearAuthCookies(context: Context, env: Env): void {
	for (const name of [SESSION_COOKIE, CSRF_COOKIE, OAUTH_COOKIE]) {
		deleteCookie(context, name, { path: "/", secure: secureFor(env), sameSite: "Lax" });
	}
}

export function readCookie(context: Context, name: string): string | null {
	return getCookie(context, name) ?? null;
}
