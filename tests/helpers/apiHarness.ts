import { type Env as HonoEnv, type Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { CSRF_COOKIE, SESSION_COOKIE } from "@api/cookies";
import { asProblem, problemBody } from "@api/errors";
import { type createApi } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";

/** The real app signed the way the page signs, for tests that need `createApi` rather than one router. */

export const CSRF = "csrf-secret-value";

export const API_ENV = {
	DISCORD_CLIENT_ID: "100000000000000009",
	DISCORD_CLIENT_SECRET: "client-secret",
	DASHBOARD_BASE_URL: "http://localhost:3000",
	DASHBOARD_SESSION_SECRET: "x".repeat(48),
	DASHBOARD_SESSION_TTL_DAYS: 7,
	DASHBOARD_ENABLED: true,
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
	return askRaw(app, who, method, path, method === "GET" ? null : JSON.stringify(body));
}

/** The same, with the body sent as written, for one no serialiser would produce. */
export async function askRaw(
	app: ReturnType<typeof createApi>,
	who: string | null,
	method: string,
	path: string,
	text: string | null,
): Promise<Answer> {
	const cookie = [`${CSRF_COOKIE}=${CSRF}`, ...(who === null ? [] : [`${SESSION_COOKIE}=${who}`])].join("; ");
	const response = await app.request(path, {
		method,
		headers: { cookie, "x-csrf-token": CSRF, "content-type": "application/json" },
		...(text === null ? {} : { body: text }),
	});
	const parsed = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
	return { status: response.status, code: parsed.error?.code, message: parsed.error?.message };
}

/** The real boundary's mapping, so a route mounted on its own answers a refusal exactly as the app would. */
export function answerLikeTheApp<Bindings extends HonoEnv>(app: Hono<Bindings>): void {
	app.onError((error) => {
		const problem = asProblem(error);
		return Response.json(problemBody(problem), { status: problem.status });
	});
}

/** What the real app's middleware sets before a route runs, for a route mounted on its own. */
export function withSession(
	app: Hono<ApiBindings>,
	client: TestifyClient,
	session: { userId: string; username?: string },
): void {
	// A fake client says nothing about features, which on the real one means every feature is on.
	const full = "featuresOff" in client ? client : Object.assign(client, { featuresOff: new Set() });
	app.use("*", async (context, next) => {
		context.set("client", full);
		context.set("env", {} as Env);
		context.set("oauth", null);
		context.set("session", { _id: "s", ...session } as never);
		await next();
	});
}
