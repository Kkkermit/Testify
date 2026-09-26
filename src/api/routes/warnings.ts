import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { forbidden, notFound, notInGuild } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { clearWarnings, editWarning, getWarnings, removeWarning } from "@database/repositories/moderationRepository";
import {
	issueWarning,
	moderationProblem,
	readGuildWarnings,
	readWarnLadder,
	toGuildWarning,
	writeWarnLadder,
} from "@lib/moderation";
import {
	memberParams,
	warningAdd,
	warningBody,
	warningParams,
	type WarningAdded,
	warningsQuery,
	warnLadderPut,
} from "@testify/shared";

export const warnings = new Hono<ApiBindings>();

warnings.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	return guild;
}

function actor(context: Context<ApiBindings>): { id: string; tag: string } {
	const session = context.get("session");

	return { id: session?.userId ?? "", tag: session?.username ?? "a server manager" };
}

/** Somebody still in the server keeps the hierarchy check; once they have left there are no roles to compare. */
async function mayChange(context: Context<ApiBindings>, userId: string): Promise<void> {
	const guild = guildOf(context);
	const [member, moderator] = await Promise.all([
		guild.members.fetch(userId).catch(() => null),
		guild.members.fetch(actor(context).id).catch(() => null),
	]);
	if (member === null) return;

	const problem =
		moderator === null
			? "Only somebody in this server can moderate its members."
			: moderationProblem(moderator, member, context.get("client").user?.id);
	if (problem !== null) throw forbidden("cannot_moderate", problem);
}

warnings.get("/", async (context) => {
	const { page } = parseQuery(context, warningsQuery);

	return context.json(await readGuildWarnings(guildOf(context).id, page));
});

warnings.get("/punishments", async (context) => context.json(await readWarnLadder(guildOf(context).id)));

/** The whole list in one request, because the control is the list and a partial write would reorder it. */
warnings.put("/punishments", async (context) => {
	const guild = guildOf(context);
	const { steps } = await parseBody(context, warnLadderPut);

	const saved = await writeWarnLadder(guild.id, steps, actor(context).id);
	await auditChange(context, {
		action: "warnings.punishments",
		summary: saved.steps.length === 0 ? "Cleared the warning punishments" : "Changed the warning punishments",
		after: saved,
	});

	return context.json(saved);
});

/** The same checks `/warn create` makes, against a live fetch of both people. */
warnings.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, warningAdd);
	const by = actor(context);

	const [member, moderator] = await Promise.all([
		guild.members.fetch(body.userId).catch(() => null),
		guild.members.fetch(by.id).catch(() => null),
	]);
	if (member === null) throw notFound("member_not_found", "They are not in this server.");
	if (member.user.bot) throw forbidden("cannot_moderate", "Bots cannot be warned.");

	const problem =
		moderator === null
			? "Only somebody in this server can moderate its members."
			: moderationProblem(moderator, member, context.get("client").user?.id);
	if (problem !== null) throw forbidden("cannot_moderate", problem);

	const { entry, outcome } = await issueWarning({
		guild,
		user: member.user,
		member,
		moderator: by,
		reason: body.reason,
	});
	await auditChange(context, {
		action: "member.warn",
		summary: `Warned ${member.user.username}`,
		after: { reason: body.reason, count: outcome.count, step: outcome.step },
	});

	const answer: WarningAdded = { warning: toGuildWarning(member.id, member.user.username, entry), outcome };
	return context.json(answer);
});

warnings.patch("/:userId/:warnId", async (context) => {
	const guild = guildOf(context);
	const { userId, warnId } = parseParams(context, warningParams);
	const { reason } = await parseBody(context, warningBody);
	await mayChange(context, userId);

	if (!(await editWarning(guild.id, userId, warnId, reason, actor(context)))) {
		throw notFound("warning_not_found", "That warning has already gone.");
	}
	await auditChange(context, { action: "member.warn.edit", summary: "Edited a warning's reason", after: { reason } });

	const record = await getWarnings(guild.id, userId);
	const edited = record?.warnings.find((warning) => warning.warnId === warnId);
	if (record === null || edited === undefined) throw notFound("warning_not_found", "That warning has already gone.");

	return context.json(toGuildWarning(userId, record.userTag, edited));
});

warnings.delete("/:userId/:warnId", async (context) => {
	const guild = guildOf(context);
	const { userId, warnId } = parseParams(context, warningParams);
	await mayChange(context, userId);

	if (!(await removeWarning(guild.id, userId, warnId))) {
		throw notFound("warning_not_found", "That warning has already gone.");
	}
	await auditChange(context, { action: "member.warn.remove", summary: "Removed a warning" });

	return context.body(null, 204);
});

warnings.delete("/:userId", async (context) => {
	const guild = guildOf(context);
	const { userId } = parseParams(context, memberParams);
	await mayChange(context, userId);
	const count = (await getWarnings(guild.id, userId))?.warnings.length ?? 0;

	if (!(await clearWarnings(guild.id, userId))) throw notFound("warnings_not_found", "They have no warnings to clear.");
	await auditChange(context, {
		action: "member.warn.clear",
		summary: `Cleared ${String(count)} warning${count === 1 ? "" : "s"}`,
	});

	return context.body(null, 204);
});
