import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem } from "@api/errors";
import { botIdentity } from "@lib/botIdentity.util";

/**
 * Unauthenticated on purpose: this is the bot's public Discord profile, which anyone can see by clicking it in
 * a member list. The sign-in screen needs it before there is a session to authenticate.
 */
export const bot = new Hono<ApiBindings>().get("/", async (context) => {
	const identity = await botIdentity(context.get("client"));

	if (identity === null) {
		throw new ApiProblem(503, "bot_connecting", "Testify is still connecting to Discord. Try again in a moment.");
	}

	return context.json(identity);
});
