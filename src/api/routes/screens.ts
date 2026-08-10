import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { requireAuth } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { toError } from "@core/errors";
import { recordScreenView } from "@database/repositories/usageRepository";
import { screenView } from "@testify/shared";

/**
 * The one write any signed-in manager makes, rather than only the owner — which is why it is not part of the
 * owner-only `analytics` app. Reading the counts back is still owner-only.
 */
export const screens = new Hono<ApiBindings>();

screens.use("*", requireAuth);

screens.post("/", async (context) => {
	const { route } = await parseBody(context, screenView);

	// The count is the least important thing in the request, so a database that is slow or down must not turn a
	// navigation into an error the reader sees.
	try {
		await recordScreenView(route);
	} catch (error) {
		context.get("client").logger.debug({ err: toError(error), route }, "[ANALYTICS] Could not record a screen view.");
	}

	return context.body(null, 204);
});
