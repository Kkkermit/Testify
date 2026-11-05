import { Hono } from "hono";
import { auditSettings } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyStarboardSettings, readStarboardSettings } from "@lib/starboard";
import { type StarboardPatch, starboardPatch } from "@testify/shared";

export const starboard = new Hono<ApiBindings>();

starboard.use("*", requireGuild);

function summarise(patch: StarboardPatch): string {
	const parts: string[] = [];
	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned the starboard on" : "Turned the starboard off");
	if (patch.channelId !== undefined) parts.push("Moved the starboard");
	if (patch.threshold !== undefined) parts.push(`Starboard needs ${String(patch.threshold)} stars`);
	if (patch.selfStar !== undefined) parts.push(patch.selfStar ? "Own stars count" : "Own stars do not count");
	return parts.join(", ");
}

starboard.get("/", async (context) => context.json(await readStarboardSettings(guildOf(context))));

starboard.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, starboardPatch);
	const before = await readStarboardSettings(guild);

	const settings = await applyStarboardSettings(guild, patch, context.get("session")?.userId ?? null);
	await auditSettings(context, { action: "starboard.update", summary: summarise(patch), before, after: settings });

	return context.json(settings);
});
