import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { databaseConnected } from "@database/connection";
import { type HealthResponse } from "@testify/shared";

/** Unauthenticated, for a reverse proxy or uptime monitor, and carries nothing an outsider could use. */
export const health = new Hono<ApiBindings>().get("/", (context) => {
	const client = context.get("client");
	const connected = databaseConnected();

	const body: HealthResponse = {
		ok: client.isReady() && connected,
		uptimeMs: Date.now() - client.startedAt,
		discord: client.isReady() ? "ready" : "connecting",
		database: connected ? "connected" : "disconnected",
	};

	return context.json(body);
});
