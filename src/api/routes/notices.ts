import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { unauthorised } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { readNoticeFeed } from "@lib/notices";

/** What the bot's owners want everybody to know, for whoever is signed in; it names no server and no member. */
export const notices = new Hono<ApiBindings>();

notices.use("*", requireAuth);

function readerOf(context: Context<ApiBindings>): string {
	const userId = context.get("session")?.userId;
	if (userId === undefined) throw unauthorised();
	return userId;
}

notices.get("/", async (context) => context.json(await readNoticeFeed(readerOf(context))));

/** A write, so CSRF guards it, and it is what the page sends once the notifications are on screen. */
notices.post("/seen", async (context) => context.json(await readNoticeFeed(readerOf(context), { markRead: true })));
