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
import { auth } from "@api/routes/auth";
import { guilds } from "@api/routes/guilds";
import { health } from "@api/routes/health";
import { owner } from "@api/routes/owner";
import { serveDashboard } from "@api/static";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";

/** Config patches, not uploads. Anything larger than this is a mistake or an attempt. */
const MAX_BODY_BYTES = 128 * 1024;

/** Generous for a person clicking around, and nowhere near enough to scrape with. */
const GENERAL_LIMIT = { limit: 300, windowMs: 60_000 };

/** Tighter, and counted separately so a spent sign-in allowance does not also block reading a page. */
const SIGN_IN_LIMIT = { limit: 20, windowMs: 60_000 };

/**
 * The dashboard's HTTP API, inside the bot process so it can read the live client cache.
 *
 * `src/core/shutdown.ts` terminates on an uncaught exception, which is right for a bot and fatal for a web
 * server — so every route runs behind an error boundary that turns a throw into a response.
 */
export function createApi(client: TestifyClient, env: Env): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();
	const general = new RateLimiter(GENERAL_LIMIT);
	const signIn = new RateLimiter(SIGN_IN_LIMIT);
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
	app.use("*", verifyCsrf);
	// The one flow an unauthenticated caller can reach that costs a Discord round trip.
	app.use("/api/auth/login", rateLimit(signIn, { name: "sign-in", trustProxy: env.DASHBOARD_TRUST_PROXY }));
	app.use("/api/auth/callback", rateLimit(signIn, { name: "sign-in", trustProxy: env.DASHBOARD_TRUST_PROXY }));
	app.use("/api/*", loadSession);

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
	app.route("/api/guilds", guilds);
	app.route("/api/owner", owner);

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

export interface RunningApi {
	/** Resolves with the port actually bound, which is only the configured one when it was not 0. */
	ready: Promise<number>;
	close(): Promise<void>;
}

/** Started after `client.login()`, so a request can never arrive before the cache is warm. */
export function startApi(client: TestifyClient, env: Env): RunningApi {
	const app = createApi(client, env);

	// After the API and nowhere else: it is a catch-all, so anything registered behind it never runs.
	serveDashboard(app);

	let listening: (port: number) => void = () => undefined;
	const ready = new Promise<number>((resolve) => {
		listening = resolve;
	});

	const server = serve({ fetch: app.fetch, port: env.DASHBOARD_PORT, hostname: env.DASHBOARD_BIND }, (info) => {
		client.logger.info(
			{ url: `http://${env.DASHBOARD_BIND}:${String(info.port)}` },
			"[DASHBOARD] The dashboard API is listening",
		);
		listening(info.port);
	}) as Server;

	const running: RunningApi = {
		ready,
		close: () =>
			new Promise<void>((resolve) => {
				server.close(() => {
					resolve();
				});
			}),
	};

	client.api = running;
	return running;
}
