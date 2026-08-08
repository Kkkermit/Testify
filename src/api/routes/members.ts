import { type Guild, type GuildMember } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, forbidden, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { addWarning, clearWarnings, removeWarning } from "@database/repositories/moderationRepository";
import { changeLevel, changeMoney, readBoard, readMemberDetail, revokeSoftban } from "@lib/memberActions.util";
import {
	boardQuery,
	levelBody,
	type MemberDetail,
	memberParams,
	moneyBody,
	moneyProblem,
	warningBody,
	warningParams,
} from "@testify/shared";

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

/** One live fetch each, because a cached member says nothing about who was demoted five minutes ago. */
async function scene(context: Context<ApiBindings>): Promise<{
	guild: Guild;
	userId: string;
	member: GuildMember | null;
	moderator: GuildMember | null;
}> {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	const actorId = context.get("session")?.userId ?? "";

	const [member, moderator] = await Promise.all([
		guild.members.fetch(userId).catch(() => null),
		guild.members.fetch(actorId).catch(() => null),
	]);

	return { guild, userId, member, moderator };
}

async function detail(context: Context<ApiBindings>): Promise<MemberDetail> {
	const { guild, userId, member, moderator } = await scene(context);

	return readMemberDetail({ guild, userId, member, moderator, botId: context.get("client").user?.id });
}

/**
 * The same check the moderation commands run, asked before every write.
 *
 * `readMemberDetail` answers it for the page too, so a greyed-out button and a refused request can never
 * disagree — but the greying is a courtesy and this is the gate.
 */
async function actOn(context: Context<ApiBindings>): Promise<{ current: MemberDetail; member: GuildMember }> {
	const { guild, userId, member, moderator } = await scene(context);
	const current = await readMemberDetail({ guild, userId, member, moderator, botId: context.get("client").user?.id });

	if (current.moderationProblem !== null || member === null) {
		throw forbidden("cannot_moderate", current.moderationProblem ?? "They are no longer in this server.");
	}

	return { current, member };
}

members.get("/:userId", async (context) => context.json(await detail(context)));

members.post("/:userId/warnings", async (context) => {
	const { current } = await actOn(context);
	const { reason } = await parseBody(context, warningBody);
	const guild = guildOf(context);
	const session = context.get("session");

	await addWarning(
		guild.id,
		current.userId,
		current.username,
		{ id: session?.userId ?? "", tag: session?.username ?? "" },
		reason,
	);
	await auditChange(context, {
		action: "member.warn",
		summary: `Warned ${current.username}`,
		after: { reason },
	});

	return context.json(await detail(context));
});

members.delete("/:userId/warnings/:warnId", async (context) => {
	const { current } = await actOn(context);
	const { warnId } = parseParams(context, warningParams);

	if (!(await removeWarning(guildOf(context).id, current.userId, warnId))) {
		throw notFound("warning_not_found", "That warning has already gone.");
	}
	await auditChange(context, { action: "member.warn.remove", summary: `Removed a warning from ${current.username}` });

	return context.json(await detail(context));
});

members.delete("/:userId/warnings", async (context) => {
	const { current } = await actOn(context);
	const count = current.warnings.length;

	if (!(await clearWarnings(guildOf(context).id, current.userId))) {
		throw notFound("warnings_not_found", "They have no warnings to clear.");
	}
	await auditChange(context, {
		action: "member.warn.clear",
		summary: `Cleared ${String(count)} warning${count === 1 ? "" : "s"} from ${current.username}`,
	});

	return context.json(await detail(context));
});

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

members.patch("/:userId/money", async (context) => {
	const { current, member } = await actOn(context);
	const { purse, delta } = await parseBody(context, moneyBody);

	const held = purse === "wallet" ? (current.economy?.wallet ?? 0) : (current.economy?.bank ?? 0);
	const problem = moneyProblem(delta, purse, held);
	if (problem !== null) throw badRequest(problem);

	await changeMoney(guildOf(context).id, member.id, purse, delta);
	await auditChange(context, {
		action: "member.money",
		summary: `${delta > 0 ? "Added" : "Took"} ${Math.abs(delta).toLocaleString()} ${delta > 0 ? "to" : "from"} ${current.username}'s ${purse}`,
		before: { [purse]: held },
	});

	return context.json(await detail(context));
});

/**
 * Lifting a softban skips the hierarchy check, and has to: a softbanned user is banned, so they are not a member
 * and have no roles to compare. `requireGuild` is the gate here.
 */
members.delete("/:userId/softban", async (context) => {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	const session = context.get("session");

	if (!(await revokeSoftban(guild, userId, session?.username ?? "a server manager"))) {
		throw notFound("softban_not_found", "There is no active softban for them.");
	}
	await auditChange(context, { action: "member.softban.revoke", summary: "Lifted a softban early" });

	return context.json(await detail(context));
});
