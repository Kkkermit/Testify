import { type Guild, type GuildMember, PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf, readerOf } from "@api/context";
import { badRequest } from "@api/errors";
import { demandPermission, holdsPermission, requireGrantable, requirePermission } from "@api/middleware/reach";
import { parseBody, parseQuery } from "@api/validate";
import { actOnEach, banUser, type BulkActor, kickMember, readDirectory, timeoutMember } from "@lib/moderation";
import {
	type BulkAction,
	bulkBanBody,
	bulkConfirmed,
	bulkKickBody,
	type BulkOutcome,
	type BulkResult,
	bulkRolesBody,
	bulkTimeoutBody,
	directoryQuery,
} from "@testify/shared";

/** The member directory and the actions it takes on several members at once; mounted inside `members`, behind `requireGuild`. */
export const directory = new Hono<ApiBindings>();

async function moderatorOf(context: Context<ApiBindings>, guild: Guild): Promise<GuildMember | null> {
	const member = context.get("member");
	if (member !== undefined) return member;

	return guild.members.fetch(context.get("session")?.userId ?? "").catch(() => null);
}

directory.get("/", async (context) => {
	const query = parseQuery(context, directoryQuery);
	// Who has warnings is what `/warn list` shows, so filtering by it asks the same.
	if (query.warned) demandPermission(context, PermissionFlagsBits.ModerateMembers);
	const guild = guildOf(context);

	return context.json(
		await readDirectory(guild, query, {
			moderator: await moderatorOf(context, guild),
			reach: readerOf(context),
			botId: context.get("client").user?.id,
			can: {
				roles: holdsPermission(context, PermissionFlagsBits.ManageRoles),
				timeout: holdsPermission(context, PermissionFlagsBits.ModerateMembers),
				warn: holdsPermission(context, PermissionFlagsBits.ModerateMembers),
				kick: holdsPermission(context, PermissionFlagsBits.KickMembers),
				ban: holdsPermission(context, PermissionFlagsBits.BanMembers),
			},
		}),
	);
});

async function actorFor(context: Context<ApiBindings>, guild: Guild): Promise<BulkActor> {
	return {
		readerId: context.get("session")?.userId ?? "",
		moderator: await moderatorOf(context, guild),
		botId: context.get("client").user?.id,
	};
}

/** One member is confirmed by name, so their username is read for the check; several are confirmed by their count. */
async function requireConfirmed(
	guild: Guild,
	action: BulkAction,
	userIds: readonly string[],
	typed: string,
): Promise<void> {
	const [only] = userIds;
	const username =
		userIds.length === 1 && only !== undefined
			? ((await guild.members.fetch(only).catch(() => null))?.user.username ?? "")
			: "";

	if (
		!bulkConfirmed(
			action,
			typed,
			userIds.map((userId) => ({ userId, username })),
		)
	) {
		throw badRequest(
			userIds.length === 1
				? "Type their username or their Discord ID exactly to confirm."
				: `Type ${String(userIds.length)}, the number of members, to confirm.`,
		);
	}
}

function tally(outcomes: readonly BulkOutcome[]): {
	done: { userId: string; username: string | null }[];
	skipped: { userId: string; reason: string }[];
} {
	return {
		done: outcomes.filter((o) => o.skipped === null).map(({ userId, username }) => ({ userId, username })),
		skipped: outcomes.flatMap((o) => (o.skipped === null ? [] : [{ userId: o.userId, reason: o.skipped }])),
	};
}

function members(count: number): string {
	return `${String(count)} ${count === 1 ? "member" : "members"}`;
}

/** One record lists everybody the action touched; each kick, ban and timeout also has a numbered case of its own. */
async function answer(
	context: Context<ApiBindings>,
	action: string,
	summary: (done: number) => string,
	outcomes: BulkOutcome[],
	detail: Record<string, unknown>,
): Promise<Response> {
	const { done, skipped } = tally(outcomes);
	if (done.length > 0) {
		await auditChange(context, { action, summary: summary(done.length), after: { ...detail, done, skipped } });
	}

	const result: BulkResult = { outcomes };
	return context.json(result);
}

directory.post("/bulk/roles", requirePermission(PermissionFlagsBits.ManageRoles), async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, bulkRolesBody);
	requireGrantable(context, [body.roleId]);
	const by = actorOf(context).name;
	const role = guild.roles.cache.get(body.roleId)?.name ?? "a role";

	const outcomes = await actOnEach(guild, body.userIds, await actorFor(context, guild), false, async (member) => {
		const held = member.roles.cache.has(body.roleId);
		if (held === body.give) return "already";

		await (body.give
			? member.roles.add(body.roleId, `Added by ${by}`)
			: member.roles.remove(body.roleId, `Removed by ${by}`));
		return "done";
	});

	return answer(
		context,
		"member.roles.bulk",
		(done) => (body.give ? `Gave ${role} to ${members(done)}` : `Took ${role} from ${members(done)}`),
		outcomes,
		{ roleId: body.roleId, give: body.give },
	);
});

directory.post("/bulk/timeout", requirePermission(PermissionFlagsBits.ModerateMembers), async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, bulkTimeoutBody);
	await requireConfirmed(guild, "timeout", body.userIds, body.confirm);
	const moderator = actorOf(context);

	const outcomes = await actOnEach(guild, body.userIds, await actorFor(context, guild), true, async (member) => {
		await timeoutMember(guild, member, moderator, body.minutes * 60_000, body.reason);
		return "done";
	});

	return answer(context, "member.timeout.bulk", (done) => `Timed out ${members(done)}`, outcomes, {
		minutes: body.minutes,
		reason: body.reason,
	});
});

directory.post("/bulk/kick", requirePermission(PermissionFlagsBits.KickMembers), async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, bulkKickBody);
	await requireConfirmed(guild, "kick", body.userIds, body.confirm);
	const moderator = actorOf(context);

	const outcomes = await actOnEach(guild, body.userIds, await actorFor(context, guild), true, async (member) => {
		await kickMember(guild, member, moderator, body.reason);
		return "done";
	});

	return answer(context, "member.kick.bulk", (done) => `Kicked ${members(done)}`, outcomes, { reason: body.reason });
});

directory.post("/bulk/ban", requirePermission(PermissionFlagsBits.BanMembers), async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, bulkBanBody);
	await requireConfirmed(guild, "ban", body.userIds, body.confirm);
	const moderator = actorOf(context);

	const outcomes = await actOnEach(guild, body.userIds, await actorFor(context, guild), true, async (member) => {
		await banUser(guild, member.user, member, moderator, body.reason, body.deleteDays);
		return "done";
	});

	return answer(context, "member.ban.bulk", (done) => `Banned ${members(done)}`, outcomes, {
		reason: body.reason,
		deleteDays: body.deleteDays,
	});
});
