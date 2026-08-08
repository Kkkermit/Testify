import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseQuery } from "@api/validate";
import { readBoard } from "@lib/memberActions.util";
import { boardQuery } from "@testify/shared";

export const members = new Hono<ApiBindings>();

members.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

members.get("/leaderboard", async (context) => {
	const { board, page } = parseQuery(context, boardQuery);

	return context.json(await readBoard(guildOf(context), board, page, context.get("session")?.userId ?? ""));
});
