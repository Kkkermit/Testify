import { Collection, type Guild, type GuildMember, PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf, readerOf } from "@api/context";
import { badRequest, forbidden, notFound } from "@api/errors";
import { requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { changeLevel, changeMoney, readBoard, readMemberDetail, revokeSoftban } from "@lib/economy";
import { problemText } from "@lib/format";
import {
	banUser,
	containsProfanity,
	kickMember,
	moderationProblem,
	removeTimeout,
	timeoutMember,
} from "@lib/moderation";
import { memberRoles, setMemberRoles } from "@lib/roles";
import {
	banBody,
	boardQuery,
	confirmsName,
	idFromQuery,
	kickBody,
	levelBody,
	type MemberDetail,
	type MemberMatch,
	memberParams,
	memberRolesBody,
	memberSearchQuery,
	moneyBody,
	moneyProblem,
	nicknameBody,
	timeoutBody,
} from "@testify/shared";

export const members = new Hono<ApiBindings>();

members.use("*", requireGuild);

members.get("/leaderboard", async (context) => {
	const { board, page, sort, scope } = parseQuery(context, boardQuery);
	const guildIds = [...context.get("client").guilds.cache.keys()];

	return context.json(
		await readBoard(guildOf(context), board, page, context.get("session")?.userId ?? "", { sort, scope, guildIds }),
	);
});

/** `fresh` skips the cache, which a timeout, a nickname or a role change made through the bot leaves out of date. */
async function scene(
	context: Context<ApiBindings>,
	fresh = false,
): Promise<{
	guild: Guild;
	userId: string;
	member: GuildMember | null;
	moderator: GuildMember | null;
}> {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	const actorId = context.get("session")?.userId ?? "";

	const [member, moderator] = await Promise.all([
		guild.members.fetch({ user: userId, force: fresh }).catch(() => null),
		guild.members.fetch(actorId).catch(() => null),
	]);

	return { guild, userId, member, moderator };
}

async function detail(context: Context<ApiBindings>, fresh = false): Promise<MemberDetail> {
	const { guild, userId, member, moderator } = await scene(context, fresh);

	return readMemberDetail({ guild, userId, member, moderator, botId: context.get("client").user?.id });
}

/** The moderation commands' own hierarchy check, run before every write; the greyed button is only a courtesy. */
async function actOn(context: Context<ApiBindings>): Promise<{ current: MemberDetail; member: GuildMember }> {
	const { guild, userId, member, moderator } = await scene(context);
	const current = await readMemberDetail({ guild, userId, member, moderator, botId: context.get("client").user?.id });

	if (current.moderationProblem !== null || member === null) {
		throw forbidden("cannot_moderate", current.moderationProblem ?? "They are no longer in this server.");
	}

	return { current, member };
}

/** Registered before `/:userId`, which would otherwise read "search" as a member id and refuse it. */
members.get("/search", async (context) => {
	const { q } = parseQuery(context, memberSearchQuery);
	const guild = guildOf(context);
	const id = idFromQuery(q);
	// An ID names one member exactly, so it is fetched rather than searched as a name.
	const found =
		id === null
			? await guild.members.search({ query: q, limit: 10 }).catch(() => null)
			: await guild.members.fetch(id).then(
					(member) => new Collection([[member.id, member]]),
					() => null,
				);

	const matches: MemberMatch[] = [...(found?.values() ?? [])]
		.filter((member) => !member.user.bot)
		.map((member) => ({
			userId: member.id,
			displayName: member.displayName,
			username: member.user.username,
			avatarUrl: member.displayAvatarURL({ size: 64 }),
		}));

	return context.json(matches);
});

members.get("/:userId", async (context) => context.json(await detail(context)));

members.patch("/:userId/level", async (context) => {
	const { current, member } = await actOn(context);
	const body = await parseBody(context, levelBody);
	const client = context.get("client");

	const change = body.level === undefined ? { xp: body.xp ?? 0 } : { level: body.level };
	const result = await changeLevel(guildOf(context), member, change, client.logger);

	await auditChange(context, {
		action: "member.level",
		summary:
			body.level === undefined
				? `Gave ${current.username} ${String(body.xp ?? 0)} XP`
				: `Set ${current.username} to level ${String(body.level)}`,
		after: { level: result.level, xp: result.xp, rolesAdded: result.rewards.added.length },
	});

	return context.json(await detail(context));
});

// `/give` and `/reset` both ask for Administrator, so writing a balance by hand does too.
members.patch("/:userId/money", requirePermission(PermissionFlagsBits.Administrator), async (context) => {
	const { current, member } = await actOn(context);
	const { purse, delta } = await parseBody(context, moneyBody);

	const held = purse === "wallet" ? (current.economy?.wallet ?? 0) : (current.economy?.bank ?? 0);
	const problem = moneyProblem(delta, purse, held);
	if (problem !== null) throw badRequest(problemText(problem));

	await changeMoney(guildOf(context).id, member.id, purse, delta);
	await auditChange(context, {
		action: "member.money",
		summary: `${delta > 0 ? "Added" : "Took"} ${Math.abs(delta).toLocaleString()} ${delta > 0 ? "to" : "from"} ${current.username}'s ${purse}`,
		before: { [purse]: held },
	});

	return context.json(await detail(context));
});

const CONFIRM_REFUSED = "Type their username or their Discord ID exactly to confirm.";

members.post("/:userId/kick", requirePermission(PermissionFlagsBits.KickMembers), async (context) => {
	const { current, member } = await actOn(context);
	const body = await parseBody(context, kickBody);
	if (!confirmsName(body.confirm, current.username, current.userId)) throw badRequest(CONFIRM_REFUSED);

	const { notified } = await kickMember(guildOf(context), member, actorOf(context), body.reason);
	await auditChange(context, {
		action: "member.kick",
		summary: `Kicked ${current.username}`,
		after: { reason: body.reason, notified },
	});

	return context.json(await detail(context));
});

/** Unlike a kick, this reaches somebody who has already left, so the hierarchy check only applies to a member. */
members.post("/:userId/ban", requirePermission(PermissionFlagsBits.BanMembers), async (context) => {
	const { guild, userId, member, moderator } = await scene(context);
	const body = await parseBody(context, banBody);
	const client = context.get("client");

	if (member !== null) {
		const problem =
			moderator === null
				? "Only somebody in this server can moderate its members."
				: moderationProblem(moderator, member, client.user?.id);
		if (problem !== null) throw forbidden("cannot_moderate", problem);
	}

	const user = member?.user ?? (await client.users.fetch(userId).catch(() => null));
	if (user === null) throw notFound("user_not_found", "Discord does not know that account.");
	if (!confirmsName(body.confirm, user.username, user.id)) throw badRequest(CONFIRM_REFUSED);

	const { notified } = await banUser(guild, user, member, actorOf(context), body.reason, body.deleteDays);
	await auditChange(context, {
		action: "member.ban",
		summary: `Banned ${user.username}`,
		after: { reason: body.reason, deleteDays: body.deleteDays, notified },
	});

	return context.json(await detail(context));
});

/** Skips the hierarchy check: a softbanned user is not a member and has no roles to compare. */
members.delete("/:userId/softban", requirePermission(PermissionFlagsBits.BanMembers), async (context) => {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	if (!(await revokeSoftban(guild, userId, actorOf(context)))) {
		throw notFound("softban_not_found", "There is no active softban for them.");
	}
	await auditChange(context, { action: "member.softban.revoke", summary: "Lifted a softban early" });

	return context.json(await detail(context));
});

members.post("/:userId/timeout", requirePermission(PermissionFlagsBits.ModerateMembers), async (context) => {
	const { current, member } = await actOn(context);
	const body = await parseBody(context, timeoutBody);
	if (!confirmsName(body.confirm, current.username, current.userId)) throw badRequest(CONFIRM_REFUSED);

	const { notified } = await timeoutMember(
		guildOf(context),
		member,
		actorOf(context),
		body.minutes * 60_000,
		body.reason,
	);
	await auditChange(context, {
		action: "member.timeout",
		summary: `Timed out ${current.username}`,
		after: { minutes: body.minutes, reason: body.reason, notified },
	});

	return context.json(await detail(context, true));
});

members.delete("/:userId/timeout", requirePermission(PermissionFlagsBits.ModerateMembers), async (context) => {
	const { current, member } = await actOn(context);

	await removeTimeout(guildOf(context), member, actorOf(context), "Lifted from the dashboard");
	await auditChange(context, { action: "member.timeout.lift", summary: `Lifted ${current.username}'s timeout` });

	return context.json(await detail(context, true));
});

// `/nickname` asks for Manage Nicknames; the hierarchy check on top is what Discord itself would ask of the person.
members.patch("/:userId/nickname", requirePermission(PermissionFlagsBits.ManageNicknames), async (context) => {
	const { current, member } = await actOn(context);
	const { nickname } = await parseBody(context, nicknameBody);

	if (nickname !== null && containsProfanity(nickname)) throw badRequest("That nickname is not allowed here.");
	if (!member.manageable)
		throw forbidden("cannot_moderate", "Their highest role is at or above mine, so I cannot rename them.");

	await member.setNickname(nickname, `Changed by ${actorOf(context).name}`);
	await auditChange(context, {
		action: "member.nickname",
		summary: nickname === null ? `Cleared ${current.username}'s nickname` : `Renamed ${current.username}`,
		before: { nickname: current.nickname },
		after: { nickname },
	});

	return context.json(await detail(context, true));
});

const manageRoles = requirePermission(PermissionFlagsBits.ManageRoles);

members.get("/:userId/roles", manageRoles, async (context) => {
	const { guild, member } = await scene(context);
	if (member === null) throw notFound("member_not_found", "They are no longer in this server.");

	return context.json(memberRoles(guild, member, readerOf(context)));
});

members.put("/:userId/roles", manageRoles, async (context) => {
	const { guild, member } = await scene(context);
	if (member === null) throw notFound("member_not_found", "They are no longer in this server.");
	const { roleIds } = await parseBody(context, memberRolesBody);
	const reader = readerOf(context);

	const {
		added,
		removed,
		member: updated,
	} = await setMemberRoles(guild, member, roleIds, reader, actorOf(context).name);
	await auditChange(context, {
		action: "member.roles",
		summary: `Changed ${member.user.username}'s roles`,
		after: { added, removed },
	});

	return context.json(memberRoles(guild, updated, reader));
});
