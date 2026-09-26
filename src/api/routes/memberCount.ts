import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notInGuild } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { readMemberCounts } from "@lib/info";
import { type MemberCounts } from "@testify/shared";

export const memberCount = new Hono<ApiBindings>();

memberCount.use("*", requireGuild);

/** Fetching every member is a gateway request per call, so a page left open or reloaded reads a recent count instead. */
const FRESH_FOR_MS = 60_000;

const recent = new Map<string, { at: number; counts: MemberCounts }>();

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	return guild;
}

memberCount.get("/", async (context) => {
	const guild = guildOf(context);
	const now = Date.now();

	const cached = recent.get(guild.id);
	if (cached !== undefined && now - cached.at < FRESH_FOR_MS) return context.json(cached.counts);

	const counts = await readMemberCounts(guild, now);
	// Keyed by guild and bounded by how many servers the bot is in, so it cannot grow past that.
	recent.set(guild.id, { at: now, counts });

	return context.json(counts);
});
