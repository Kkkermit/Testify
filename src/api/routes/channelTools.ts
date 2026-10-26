import { PermissionFlagsBits, type GuildMember } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf } from "@api/context";
import { forbidden } from "@api/errors";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { DEFAULT_REASON, readChannelTools, setLocked, setSlowmode, textChannelOf, toolChannel } from "@lib/moderation";
import { channelToolParams, channelToolPatch } from "@testify/shared";

export const channelTools = new Hono<ApiBindings>();

channelTools.use("*", requireGuild);

// `/lock`, `/unlock` and `/slowmode` each ask for Manage Channels.
const manageChannels = requirePermission(PermissionFlagsBits.ManageChannels);

function readerOf(context: Context<ApiBindings>): GuildMember | undefined {
	return context.get("isOwner") === true ? undefined : context.get("member");
}

channelTools.get("/", manageChannels, (context) => context.json(readChannelTools(guildOf(context), readerOf(context))));

/** Each channel is checked on its own, since a server-wide Manage Channels can still be taken away in one. */
channelTools.patch("/:channelId", manageChannels, async (context) => {
	const guild = guildOf(context);
	const { channelId } = parseParams(context, channelToolParams);
	const patch = await parseBody(context, channelToolPatch);
	const channel = textChannelOf(guild, channelId);
	const reader = readerOf(context);
	const before = toolChannel(channel, guild, reader);

	if (patch.locked !== undefined && !before.canLock) {
		throw forbidden(
			"channel_out_of_reach",
			`Locking #${channel.name} needs Manage Channels for you and Manage Roles for me there.`,
		);
	}
	if (patch.slowmodeSeconds !== undefined && !before.canSlow) {
		throw forbidden("channel_out_of_reach", `Slowmode in #${channel.name} needs Manage Channels for both of us there.`);
	}

	const reason = `${actorOf(context).name}: ${patch.reason ?? DEFAULT_REASON}`;
	if (patch.locked !== undefined) await setLocked(channel, guild, patch.locked, reason);
	if (patch.slowmodeSeconds !== undefined) await setSlowmode(channel, patch.slowmodeSeconds, reason);

	const parts: string[] = [];
	if (patch.locked !== undefined) parts.push(`${patch.locked ? "Locked" : "Unlocked"} #${channel.name}`);
	if (patch.slowmodeSeconds !== undefined) parts.push(`Set slowmode in #${channel.name}`);
	await auditChange(context, {
		action: "channel.tools",
		summary: parts.join(", "),
		before: { locked: before.locked, slowmodeSeconds: before.slowmodeSeconds },
		after: { locked: patch.locked ?? before.locked, slowmodeSeconds: patch.slowmodeSeconds ?? before.slowmodeSeconds },
	});

	// A channel edit patches the cache as it returns; an overwrite waits for Discord's next channel update.
	const after = toolChannel(textChannelOf(guild, channelId), guild, reader);
	return context.json(patch.locked === undefined ? after : { ...after, locked: patch.locked });
});
