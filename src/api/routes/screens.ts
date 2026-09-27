import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { toError } from "@core/errors";
import { recordScreenView } from "@database/repositories/usageRepository";
import { screenView } from "@testify/shared";

/** The one write any signed-in manager makes; reading the counts back stays owner-only. */
export const screens = new Hono<ApiBindings>();

screens.use("*", requireAuth);

screens.post("/", async (context) => {
	const { route } = await parseBody(context, screenView);

	// A failed count must never turn a navigation into an error.
	try {
		await recordScreenView(route);
	} catch (error) {
		context.get("client").logger.debug({ err: toError(error), route }, "[ANALYTICS] Could not record a screen view.");
	}

	return context.body(null, 204);
});
