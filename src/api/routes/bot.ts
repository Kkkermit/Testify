import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem } from "@api/errors";
import { botIdentity } from "@lib/bot";

/** Unauthenticated: the bot's public profile, which the sign-in screen needs before a session exists. */
export const bot = new Hono<ApiBindings>().get("/", async (context) => {
	const identity = await botIdentity(context.get("client"));

	if (identity === null) {
		throw new ApiProblem(503, "bot_connecting", "Testify is still connecting to Discord. Try again in a moment.");
	}

	return context.json(identity);
});
