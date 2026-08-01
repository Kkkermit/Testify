import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { DEFAULT_PREFIX } from "@config/constants";
import { buildCatalogue } from "@lib/commandCatalogue.util";

/**
 * Every command the bot has, read from the live registry. Behind a session because owner commands are filtered
 * by who is asking, and there is no reason for it to be reachable without one.
 */
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
