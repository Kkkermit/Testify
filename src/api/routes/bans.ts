import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf } from "@api/context";
import { forbidden } from "@api/errors";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { revokeSoftban } from "@lib/economy";
import { DEFAULT_REASON, readBans, unbanUser } from "@lib/moderation";
import { banQuery, memberParams, unbanBody } from "@testify/shared";

export const bans = new Hono<ApiBindings>();

bans.use("*", requireGuild);

// Discord shows a server's bans only to somebody who could lift them, so reading them asks what `/unban` asks.
const banMembers = requirePermission(PermissionFlagsBits.BanMembers);

bans.get("/", banMembers, async (context) => {
	const { page, q } = parseQuery(context, banQuery);
	return context.json(await readBans(guildOf(context), { page, query: q }));
});

/** A softban is lifted through its own record, so the job that would have lifted it later has nothing left to do. */
bans.post("/:userId/unban", banMembers, async (context) => {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	const { reason } = await parseBody(context, unbanBody);

	if (guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers) !== true) {
		throw forbidden("bot_missing_permission", "I need the Ban Members permission to lift a ban.");
	}

	const actor = actorOf(context);
	const softban = await revokeSoftban(guild, userId, actor);
	const user = softban ? null : await unbanUser(guild, userId, actor, reason ?? DEFAULT_REASON);

	await auditChange(context, {
		action: softban ? "member.softban.revoke" : "member.unban",
		summary: softban ? "Lifted a softban early" : `Unbanned ${user?.username ?? userId}`,
		after: { reason: reason ?? null },
	});

	return context.json(await readBans(guild, { page: 1, query: "" }));
});
