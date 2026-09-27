import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { statusReport } from "@lib/bot";
import { musicBinaries } from "@lib/music";
import { type StatusResponse } from "@testify/shared";

/** Reused briefly, so a page left open in several tabs costs one database ping rather than one each. */
const FRESH_MS = 5_000;

let cached: { at: number; body: StatusResponse } | null = null;

export function forgetStatus(): void {
	cached = null;
}

/** Any signed-in person may read it: it names no server and no member, only how the bot itself is doing. */
export const status = new Hono<ApiBindings>();

status.use("*", requireAuth);

status.get("/", async (context) => {
	const client = context.get("client");
	const now = Date.now();

	if (cached === null || now - cached.at > FRESH_MS) {
		cached = { at: now, body: await statusReport(client, { binaries: musicBinaries(client), now }) };
	}

	return context.json(cached.body);
});
