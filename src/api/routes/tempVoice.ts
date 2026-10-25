import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { applyTempVoiceSettings, makeLobby, readTempVoiceSettings } from "@lib/tempVoice";
import { type TempVoicePatch, tempVoicePatch } from "@testify/shared";

export const tempVoice = new Hono<ApiBindings>();

tempVoice.use("*", requireGuild);

function summarise(patch: TempVoicePatch): string {
	const parts: string[] = [];
	if (patch.enabled !== undefined) parts.push(patch.enabled ? "Turned join to create on" : "Turned join to create off");
	if (patch.lobbyChannelId !== undefined) parts.push("Changed the join-to-create lobby");
	if (patch.categoryId !== undefined) parts.push("Moved where new voice channels go");
	if (patch.nameTemplate !== undefined) parts.push("Renamed new voice channels");
	if (patch.userLimit !== undefined) parts.push("Changed the voice channel limit");
	return parts.join(", ");
}

tempVoice.get("/", async (context) => context.json(await readTempVoiceSettings(guildOf(context))));

tempVoice.patch("/", async (context) => {
	const guild = guildOf(context);
	const patch = await parseBody(context, tempVoicePatch);

	const settings = await applyTempVoiceSettings(guild, patch, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "temp-voice.update", summary: summarise(patch) });

	return context.json(settings);
});

/** Making a channel is what Discord asks Manage Channels for, so the web asks it too. */
tempVoice.post("/lobby", requirePermission(PermissionFlagsBits.ManageChannels), async (context) => {
	const guild = guildOf(context);

	const settings = await makeLobby(guild, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "temp-voice.lobby", summary: "Made a join-to-create lobby" });

	return context.json(settings);
});
