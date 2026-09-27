import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { DEFAULT_PREFIX } from "@config/constants";
import { buildCatalogue } from "@lib/bot";

/** Every command the bot has; behind a session because owner commands are filtered by who asks. */
export const commands = new Hono<ApiBindings>().use("*", requireAuth).get("/", (context) => {
	const client = context.get("client");
	const session = context.get("session");

	return context.json(
		buildCatalogue(client.commands.values(), {
			prefix: DEFAULT_PREFIX,
			includeOwnerOnly: session !== undefined && client.isOwner(session.userId),
		}),
	);
});
