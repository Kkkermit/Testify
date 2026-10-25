import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyRaidSettings, readRaidOverview } from "@lib/raid";
import { type RaidPatch, raidPatch } from "@testify/shared";

export const raid = new Hono<ApiBindings>();

raid.use("*", requireGuild);

/** Read on the overview's recent-changes card, so it has to say what changed without opening the diff. */
function summarise(patch: RaidPatch): string {
	const parts: string[] = [];
	if (patch.enabled !== undefined)
		parts.push(patch.enabled ? "Turned raid protection on" : "Turned raid protection off");
	if (patch.minAccountAgeDays !== undefined) parts.push("Changed the minimum account age");
	if (patch.spikeJoins !== undefined || patch.spikeMinutes !== undefined) parts.push("Changed the spike alert");
	if (patch.alertChannelId !== undefined) parts.push("Moved raid alerts");
	if (patch.pingRoleId !== undefined) parts.push("Changed who a raid alert pings");
	return parts.join(", ");
}

raid.get("/", async (context) => context.json(await readRaidOverview(guildOf(context))));

// A hold is a timeout, so changing what holds people back asks what `/mute` asks.
raid.patch("/", requirePermission(PermissionFlagsBits.ModerateMembers), async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, raidPatch);

	const saved = await applyRaidSettings(guild, patch, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "raid.update", summary: summarise(patch) });

	return context.json(saved);
});
