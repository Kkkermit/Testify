import { type Server } from "node:http";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { health } from "@api/routes/health";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type ApiErrorBody } from "@testify/shared";

/**
 * The dashboard's HTTP API, inside the bot process so it can read the live client cache.
 *
 * `src/core/shutdown.ts` terminates on an uncaught exception, which is right for a bot and fatal for a web
 * server — so every route runs behind an error boundary that turns a throw into a 500.
 */
export function createApi(client: TestifyClient, env: Env): Hono<ApiBindings> {
	const app = new Hono<ApiBindings>();

	app.use("*", async (context, next) => {
		context.set("client", client);
		context.set("env", env);
		await next();
	});

	app.onError((error, context) => {
		client.logger.error(
			{ err: toError(error), path: context.req.path, method: context.req.method },
			"[API_ERROR] A dashboard request failed",
		);

		const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong on our side." } };
		return context.json(body, 500);
	});

	app.notFound((context) => {
		const body: ApiErrorBody = { error: { code: "not_found", message: "No such endpoint." } };
		return context.json(body, 404);
	});

	app.route("/api/health", health);

	return app;
}

export interface RunningApi {
	/** Resolves with the port actually bound, which is only the configured one when it was not 0. */
	ready: Promise<number>;
	close(): Promise<void>;
}

/** Started after `client.login()`, so a request can never arrive before the cache is warm. */
export function startApi(client: TestifyClient, env: Env): RunningApi {
	const app = createApi(client, env);

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
