import { type Guild, type GuildMember, type User } from "discord.js";
import { theme } from "@config/theme";
import { type WarnEntry, type WarnLadderRecord } from "@database/models/moderation.schema";
import {
	addWarning,
	countWarnings,
	getWarnLadder,
	listGuildWarnings,
	saveWarnLadder,
	setWarningStep,
} from "@database/repositories/moderationRepository";
import { formatDurationLong } from "@lib/format/format.util";
import { dmEmbed, notifyTarget } from "@lib/moderation/moderationActions.util";
import {
	type GuildWarning,
	type GuildWarningsPage,
	stepFor,
	storedStep,
	stepValue,
	WARN_LIMITS,
	type WarnLadder,
	type WarnOutcome,
	type WarnProblem,
	type WarnStep,
	warningMatches,
	warnStep,
} from "@testify/shared";

/** Issuing a warning and carrying out the step it lands on, for `/warn`, the dashboard and the link filter alike. */

/** A step stored by an older build, or edited by hand, is dropped rather than trusted. */
export function ladderOf(record: Pick<WarnLadderRecord, "steps"> | null): WarnLadder {
	const steps = (record?.steps ?? []).flatMap((stored) => {
		const parsed = warnStep.safeParse(
			stored.minutes === undefined || stored.minutes === null ? { action: stored.action } : stored,
		);
		return parsed.success ? [parsed.data] : [];
	});

	return { steps: steps.slice(0, WARN_LIMITS.maxSteps) };
}

export async function readWarnLadder(guildId: string): Promise<WarnLadder> {
	return ladderOf(await getWarnLadder(guildId));
}

export async function writeWarnLadder(guildId: string, steps: WarnStep[], userId: string): Promise<WarnLadder> {
	return ladderOf(await saveWarnLadder(guildId, steps.slice(0, WARN_LIMITS.maxSteps), userId));
}

/** The bot's own English for a step. */
export function stepLabel(step: WarnStep): string {
	switch (step.action) {
		case "warn":
			return "Warning only";
		case "timeout":
			return `Time out for ${formatDurationLong(step.minutes * 60_000)}`;
		case "kick":
			return "Kick";
		case "ban":
			return "Ban";
	}
}

/** What a stored warning did, in the words `/warn list` and `/warn info` show. */
export function warningActionText(entry: Pick<WarnEntry, "step" | "stepProblem">): string {
	const { step, stepProblem } = storedStep(entry.step, entry.stepProblem);
	if (step === null) return "Warning only";

	return stepProblem === null ? stepLabel(step) : `${stepLabel(step)} (not carried out)`;
}

/** Why the step could not be carried out, or null when it was, or when there was nothing to do. */
export async function applyWarnStep(
	guild: Guild,
	user: User,
	member: GuildMember | null,
	step: WarnStep | null,
	auditReason: string,
): Promise<WarnProblem | null> {
	if (step === null || step.action === "warn") return null;

	const attempt = (work: Promise<unknown>): Promise<WarnProblem | null> =>
		work.then(
			() => null,
			(): WarnProblem => "refused",
		);

	if (step.action === "ban") {
		if (member !== null && !member.bannable) return "outranked";
		return attempt(guild.members.ban(user.id, { reason: auditReason }));
	}

	if (member === null) return "left";

	if (step.action === "kick") return member.kickable ? attempt(member.kick(auditReason)) : "outranked";

	return member.moderatable ? attempt(member.timeout(step.minutes * 60_000, auditReason)) : "outranked";
}

const PERMISSION: Record<Exclude<WarnStep["action"], "warn">, string> = {
	timeout: "Moderate Members",
	kick: "Kick Members",
	ban: "Ban Members",
};

/** The bot's own English for a step that could not be carried out. */
export function warnProblemText(problem: WarnProblem, step: WarnStep): string {
	if (step.action === "warn") return "";

	switch (problem) {
		case "left":
			return "they are no longer in the server.";
		case "outranked":
			return `their highest role is not below mine, or I lack ${PERMISSION[step.action]}.`;
		case "refused":
			return `Discord refused it. Check that I have ${PERMISSION[step.action]}.`;
	}
}

export interface Issued {
	entry: WarnEntry;
	outcome: WarnOutcome;
	notified: boolean;
}

export async function issueWarning(options: {
	guild: Guild;
	user: User;
	member: GuildMember | null;
	moderator: { id: string; tag: string };
	reason: string;
	/** The link filter warns silently; a moderator's warning is always sent to the member. */
	notify?: boolean;
}): Promise<Issued> {
	const { guild, user, member, moderator, reason } = options;

	const entry = await addWarning(guild.id, user.id, user.username, moderator, reason);
	const [count, ladder] = await Promise.all([countWarnings(guild.id, user.id), readWarnLadder(guild.id)]);
	const step = stepFor(ladder.steps, count);

	// Sent before the step, because a member who has been kicked or banned can no longer be reached.
	const notified =
		options.notify === false
			? false
			: await notifyTarget(
					user,
					dmEmbed({
						action: `warned in ${guild.name}`,
						emoji: theme.emoji.warning,
						guild,
						moderator: { username: moderator.tag },
						reason,
						extra: [
							{ name: "Warning ID", value: `\`${entry.warnId}\``, inline: true },
							{ name: "Warnings so far", value: String(count), inline: true },
							...(step === null || step.action === "warn"
								? []
								: [{ name: "Consequence", value: stepLabel(step), inline: true }]),
						],
					}),
				);

	const problem = await applyWarnStep(
		guild,
		user,
		member,
		step,
		`${moderator.tag}: ${reason} (warning ${String(count)})`,
	);

	// A plain warning with no punishments set has nothing to record, and reads back as plain without it.
	if (step !== null) {
		await setWarningStep(guild.id, user.id, entry.warnId, stepValue(step), problem);
		entry.step = stepValue(step);
		entry.stepProblem = problem;
	}

	return { entry, outcome: { count, step, problem }, notified };
}

/** Every warning in a server, newest first, flattened out of the per-member records they are stored in. */
export async function readGuildWarnings(
	guildId: string,
	page: number,
	options: { perPage?: number; query?: string } = {},
): Promise<GuildWarningsPage> {
	const records = await listGuildWarnings(guildId);
	const query = options.query?.trim() ?? "";
	const all = records
		.filter((record) => query === "" || warningMatches({ userId: record.userId, username: record.userTag }, query))
		.flatMap((record) => record.warnings.map((warning) => toGuildWarning(record.userId, record.userTag, warning)))
		.sort((a, b) => b.at.localeCompare(a.at));

	const perPage = options.perPage ?? WARN_LIMITS.perPage;
	const pages = Math.max(1, Math.ceil(all.length / perPage));
	const current = Math.min(page, pages);

	return {
		items: all.slice((current - 1) * perPage, current * perPage),
		total: all.length,
		page: current,
		perPage,
	};
}

export function toGuildWarning(userId: string, username: string, warning: WarnEntry): GuildWarning {
	return {
		id: warning.warnId,
		userId,
		username,
		reason: warning.reason,
		byId: warning.executorId,
		byTag: warning.executorTag,
		at: new Date(warning.timestamp).toISOString(),
		edited: warning.edits.length > 0,
		...storedStep(warning.step, warning.stepProblem),
	};
}
