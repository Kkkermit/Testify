import { type Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, notFound, problemBody } from "@api/errors";
import { verifyCsrf } from "@api/middleware/csrf";
import { RateLimiter, rateLimit } from "@api/middleware/rateLimit";
import { securityHeaders } from "@api/middleware/security";
import { loadSession } from "@api/middleware/session";
import { oauthConfigFrom } from "@api/oauth";
import { analytics } from "@api/routes/analytics";
import { auth } from "@api/routes/auth";
import { bot } from "@api/routes/bot";
import { commands } from "@api/routes/commands";
import { control } from "@api/routes/control";
import { guilds } from "@api/routes/guilds";
import { health } from "@api/routes/health";
import { owner } from "@api/routes/owner";
import { serveDashboard } from "@api/static";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import { dashboardUrl } from "@lib/dashboard.util";

/** Config patches, not uploads. Anything larger than this is a mistake or an attempt. */
const MAX_BODY_BYTES = 128 * 1024;

/** Generous for a person clicking around, and nowhere near enough to scrape with. */
const GENERAL_LIMIT = { limit: 300, windowMs: 60_000 };

/** Tighter, and counted separately so a spent sign-in allowance does not also block reading a page. */
const SIGN_IN_LIMIT = { limit: 20, windowMs: 60_000 };

/** One address can be a household, an office or a school, so its ceiling is a multiple of one person's. */
const ADDRESS_MULTIPLIER = 6;

function limiterPair(window: { limit: number; windowMs: number }): {
	perCaller: RateLimiter;
	perAddress: RateLimiter;
} {
	return {
		perCaller: new RateLimiter(window),
		perAddress: new RateLimiter({ ...window, limit: window.limit * ADDRESS_MULTIPLIER }),
	};
}

/**
 * The dashboard's HTTP API, inside the bot process so it can read the live client cache.
 *
 * Every route runs behind an error boundary, so a throw becomes a response rather than an open request that
 * never answers.
 */
export function createApi(client: TestifyClient, env: Env): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();
	const general = limiterPair(GENERAL_LIMIT);
	const signIn = limiterPair(SIGN_IN_LIMIT);
	const oauth = oauthConfigFrom(env);

	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", env);
		context.set("oauth", oauth);
		await next();
	});

	app.use("*", securityHeaders(env));
	app.use("*", rateLimit(general, { name: "general", trustProxy: env.DASHBOARD_TRUST_PROXY }));
	app.use("*", bodyLimit({ maxSize: MAX_BODY_BYTES, onError: () => raise(badRequest("That request is too large.")) }));
	// The one flow an unauthenticated caller can reach that costs a Discord round trip.
	app.use("/api/auth/login", rateLimit(signIn, { name: "sign-in", trustProxy: env.DASHBOARD_TRUST_PROXY }));
	app.use("/api/auth/callback", rateLimit(signIn, { name: "sign-in", trustProxy: env.DASHBOARD_TRUST_PROXY }));
	// Before `verifyCsrf`, which compares against the session's stored secret when there is one.
	app.use("/api/*", loadSession);
	app.use("*", verifyCsrf);

	app.onError((error, context) => {
		const problem = asProblem(error);

		if (problem.status >= 500) {
			client.logger.error(
				{ err: toError(error), path: context.req.path, method: context.req.method },
				"[API_ERROR] A dashboard request failed",
			);
		} else {
			client.logger.debug(
				{ code: problem.code, path: context.req.path, method: context.req.method },
				"[API] A dashboard request was refused",
			);
		}

		for (const [name, value] of Object.entries(problem.headers)) context.header(name, value);
		return context.json(problemBody(problem), problem.status);
	});

	app.notFound((context) => context.json(problemBody(notFound()), 404));

	app.route("/api/health", health);
	app.route("/api/auth", auth);
	app.route("/api/bot", bot);
	app.route("/api/commands", commands);
	app.route("/api/guilds", guilds);
	app.route("/api/owner", owner);
	app.route("/api/analytics", analytics);
	app.route("/api/control", control);

	return app;
}

/**
 * A refusal keeps its status and its wording; a `UserFacingError` is the bot's own "you did something wrong",
 * which is exactly a 400. Anything else is a bug, and the caller is told nothing about it.
 */
function asProblem(error: unknown): ApiProblem {
	if (error instanceof ApiProblem) return error;
	if (error instanceof UserFacingError) return badRequest(error.message);

	return new ApiProblem(500, "internal", "Something went wrong on our side.");
}

/** `bodyLimit` wants a response from `onError`, and throwing from inside it is what reaches the boundary. */
function raise(problem: ApiProblem): never {
	throw problem;
}

/** The two ways a listen fails are both the operator's to fix, so the log says which one and what to do. */
export function listenAdvice(error: NodeJS.ErrnoException, port: number): string {
	if (error.code === "EADDRINUSE") {
		return `[DASHBOARD_ERROR] Port ${String(port)} is already in use. Stop whatever is on it, or set DASHBOARD_PORT to a free port. The bot is running without the dashboard.`;
	}
	if (error.code === "EACCES") {
		return `[DASHBOARD_ERROR] Port ${String(port)} needs elevated privileges. Use a port above 1024. The bot is running without the dashboard.`;
	}

	return "[DASHBOARD_ERROR] The dashboard could not start listening. The bot is running without it.";
}

/** How many times a listen is worth retrying, and how long to wait between attempts. */
export const LISTEN_RETRIES = 5;
export const LISTEN_RETRY_MS = 3_000;

/**
 * Waiting only helps for a port somebody else still holds — a restart releasing its old listener is the usual
 * case, and by the third attempt it has. A permission it does not have will never arrive.
 */
export function worthRetrying(error: NodeJS.ErrnoException): boolean {
	return error.code === "EADDRINUSE" || error.code === "EAGAIN";
}

export interface RunningApi {
	/** Resolves with the port actually bound, which is only the configured one when it was not 0. */
	ready: Promise<number>;
	close(): Promise<void>;
}

export interface ListenOptions {
	retries?: number;
	retryDelayMs?: number;
}

/** Started after `client.login()`, so a request can never arrive before the cache is warm. */
export function startApi(client: TestifyClient, env: Env, options: ListenOptions = {}): RunningApi {
	const retries = options.retries ?? LISTEN_RETRIES;
	const retryDelayMs = options.retryDelayMs ?? LISTEN_RETRY_MS;
	const app = createApi(client, env);

	// After the API and nowhere else: it is a catch-all, so anything registered behind it never runs.
	serveDashboard(app);

	let listening: (port: number) => void = () => undefined;
	let failed: (error: Error) => void = () => undefined;
	const ready = new Promise<number>((resolve, reject) => {
		listening = resolve;
		failed = reject;
	});

	let server: Server | null = null;
	let retry: NodeJS.Timeout | null = null;
	let closed = false;

	function attempt(remaining: number): void {
		if (closed) return;

		server = serve({ fetch: app.fetch, port: env.DASHBOARD_PORT, hostname: env.DASHBOARD_BIND }, (info) => {
			const api = `http://${env.DASHBOARD_BIND}:${String(info.port)}`;
			client.logger.info(
				{ api, open: dashboardUrl(env) ?? api },
				"[DASHBOARD] The API is listening. Open the dashboard at the `open` address.",
			);
			listening(info.port);
		}) as Server;

		// An unhandled `error` event on a Node server throws, so a busy port needs a listener here rather than a
		// trip through the process handlers.
		server.on("error", (error: NodeJS.ErrnoException) => {
			if (remaining > 0 && worthRetrying(error)) {
				client.logger.warn(
					{ port: env.DASHBOARD_PORT, attemptsLeft: remaining },
					"[DASHBOARD] The port is still busy. Trying again shortly.",
				);
				retry = setTimeout(() => attempt(remaining - 1), retryDelayMs);
				retry.unref();
				return;
			}

			client.logger.error(
				{ err: error, port: env.DASHBOARD_PORT, bind: env.DASHBOARD_BIND },
				listenAdvice(error, env.DASHBOARD_PORT),
			);
			failed(error);
		});
	}

	attempt(retries);

	const running: RunningApi = {
		ready,
		close: () =>
			new Promise<void>((resolve) => {
				closed = true;
				if (retry !== null) clearTimeout(retry);
				if (server === null) return resolve();

				server.close(() => {
					resolve();
				});
			}),
	};

	client.api = running;
	return running;
}
