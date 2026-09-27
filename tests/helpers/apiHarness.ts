import { CSRF_COOKIE, SESSION_COOKIE } from "@api/cookies";
import { type createApi } from "@api/server";
import { type Env } from "@config/env";

/** The real app signed the way the page signs, for tests that need `createApi` rather than one router. */

export const CSRF = "csrf-secret-value";

export const API_ENV = {
	DISCORD_CLIENT_ID: "100000000000000009",
	DISCORD_CLIENT_SECRET: "client-secret",
	DASHBOARD_BASE_URL: "http://localhost:3000",
	DASHBOARD_SESSION_SECRET: "x".repeat(48),
	DASHBOARD_SESSION_TTL_DAYS: 7,
	DASHBOARD_PORT: 3_000,
	DASHBOARD_BIND: "127.0.0.1",
	DASHBOARD_TRUST_PROXY: false,
	NODE_ENV: "test",
} as unknown as Env;

/** A live session document for `findSession` to hand back, keyed by the user it belongs to. */
export function sessionOf(userId: string): never {
	return { _id: userId, userId, csrfSecret: CSRF, expiresAt: new Date(Date.now() + 60_000) } as never;
}

export interface Answer {
	status: number;
	code: string | undefined;
	message: string | undefined;
}

/** A session cookie and a matching CSRF header, so it is the access checks that answer rather than the CSRF one. */
export async function ask(
	app: ReturnType<typeof createApi>,
	who: string | null,
	method: string,
	path: string,
	body: unknown = {},
): Promise<Answer> {
	const cookie = [`${CSRF_COOKIE}=${CSRF}`, ...(who === null ? [] : [`${SESSION_COOKIE}=${who}`])].join("; ");
	const response = await app.request(path, {
		method,
		headers: { cookie, "x-csrf-token": CSRF, "content-type": "application/json" },
		...(method === "GET" ? {} : { body: JSON.stringify(body) }),
	});
	const parsed = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
	return { status: response.status, code: parsed.error?.code, message: parsed.error?.message };
}
