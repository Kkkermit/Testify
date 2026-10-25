import { type EmbedBuilder, type Guild } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import {
	createCase,
	findCase,
	getCaseSettings,
	listCases,
	nextCaseNumber,
	saveCaseSettings,
	type StoredCase,
} from "@database/repositories/caseRepository";
import { listGuildWarnings } from "@database/repositories/moderationRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { embed } from "@lib/discord/embeds.util";
import { discordTime, formatDurationLong } from "@lib/format/format.util";
import {
	type CaseAction,
	CASE_LIMITS,
	type CasePage,
	type CaseSettings,
	idFromQuery,
	type ModCase,
} from "@testify/shared";

/** Numbered moderation cases: recorded wherever an action is taken, and read back with the warnings from before them. */

export const CASE_ACTION_LABELS: Record<CaseAction, string> = {
	warn: "Warning",
	timeout: "Timeout",
	untimeout: "Timeout removed",
	kick: "Kick",
	ban: "Ban",
	softban: "Softban",
	unban: "Unban",
};

export interface CaseInput {
	action: CaseAction;
	user: { id: string; username: string };
	moderator: { id: string; name: string };
	reason: string;
	durationMs?: number | null;
}

function toModCase(stored: StoredCase): ModCase {
	return {
		number: stored.number,
		action: stored.action,
		userId: stored.userId,
		username: stored.username,
		moderatorId: stored.moderatorId,
		moderatorName: stored.moderatorName,
		reason: stored.reason,
		durationMs: stored.durationMs ?? null,
		at: new Date(stored.createdAt).toISOString(),
	};
}

export function caseEmbed(modCase: ModCase): EmbedBuilder {
	return embed({
		category: "moderation",
		title: `${modCase.number === null ? "Earlier warning" : `Case ${String(modCase.number)}`} · ${CASE_ACTION_LABELS[modCase.action]}`,
		fields: [
			{ name: "Member", value: `<@${modCase.userId}> · ${modCase.username} (\`${modCase.userId}\`)`, inline: false },
			{ name: "Moderator", value: `<@${modCase.moderatorId}> · ${modCase.moderatorName}`, inline: true },
			...(modCase.durationMs === null
				? []
				: [{ name: "For", value: formatDurationLong(modCase.durationMs), inline: true }]),
			{ name: "When", value: discordTime(new Date(modCase.at), "f"), inline: true },
			{ name: "Reason", value: modCase.reason.slice(0, 1_024), inline: false },
		],
	});
}

async function postCase(guild: Guild, modCase: ModCase): Promise<void> {
	const channelId = (await getCaseSettings(guild.id))?.logChannelId ?? null;
	if (channelId === null) return;

	const channel = await guild.channels.fetch(channelId).catch(() => null);
	if (channel?.isSendable() !== true) return;

	// The reason is whatever the moderator typed, and the mentions are there to be read, not to ping.
	await channel.send({ embeds: [caseEmbed(modCase)], allowedMentions: { parse: [] } });
}

/** Never throws: the action it records has already happened, so a failure here is logged rather than reported as one. */
export async function recordCase(guild: Guild, input: CaseInput): Promise<ModCase | null> {
	try {
		const number = await nextCaseNumber(guild.id);
		const modCase = toModCase(
			await createCase(guild.id, number, {
				action: input.action,
				userId: input.user.id,
				username: input.user.username,
				moderatorId: input.moderator.id,
				moderatorName: input.moderator.name,
				reason: input.reason,
				durationMs: input.durationMs ?? null,
			}),
		);
		await postCase(guild, modCase).catch((error: unknown) => {
			(guild.client as TestifyClient).logger.warn(
				{ err: toError(error), guildId: guild.id },
				"[CASES] A case could not be posted to the log channel. Check the bot can still send messages there.",
			);
		});
		return modCase;
	} catch (error) {
		(guild.client as TestifyClient).logger.error(
			{ err: toError(error), guildId: guild.id },
			"[CASES] A moderation case could not be recorded. The action itself went through.",
		);
		return null;
	}
}

/** A case number, an id or mention, or part of a name or reason. */
function caseMatches(modCase: ModCase, query: string): boolean {
	const trimmed = query.trim();
	if (trimmed === "") return true;

	const number = /^#?(\d{1,9})$/.exec(trimmed)?.[1];
	if (number !== undefined && modCase.number === Number(number)) return true;

	const id = idFromQuery(trimmed);
	if (id !== null) return modCase.userId === id || modCase.moderatorId === id;

	const lower = trimmed.toLowerCase();
	return (
		modCase.username.toLowerCase().includes(lower) ||
		modCase.moderatorName.toLowerCase().includes(lower) ||
		modCase.reason.toLowerCase().includes(lower)
	);
}

/** Warnings stored before cases were numbered still belong in the list, so they are read as unnumbered cases. */
async function earlierWarnings(guildId: string, userId?: string): Promise<ModCase[]> {
	const records = await listGuildWarnings(guildId);

	return records
		.filter((record) => userId === undefined || record.userId === userId)
		.flatMap((record) =>
			record.warnings
				.filter((warning) => warning.caseNumber === undefined || warning.caseNumber === null)
				.map((warning): ModCase => ({
					number: null,
					action: "warn",
					userId: record.userId,
					username: record.userTag,
					moderatorId: warning.executorId,
					moderatorName: warning.executorTag,
					reason: warning.reason,
					durationMs: null,
					at: new Date(warning.timestamp).toISOString(),
				})),
		);
}

export async function readCases(
	guildId: string,
	options: { page?: number; query?: string; action?: CaseAction; userId?: string; perPage?: number } = {},
): Promise<CasePage> {
	const [cases, earlier] = await Promise.all([
		listCases(guildId, options.userId),
		earlierWarnings(guildId, options.userId),
	]);

	const all = [...cases.map(toModCase), ...earlier]
		.filter((modCase) => options.action === undefined || modCase.action === options.action)
		.filter((modCase) => caseMatches(modCase, options.query ?? ""))
		.sort((a, b) => b.at.localeCompare(a.at) || (b.number ?? 0) - (a.number ?? 0));

	const perPage = options.perPage ?? CASE_LIMITS.perPage;
	const pages = Math.max(1, Math.ceil(all.length / perPage));
	const page = Math.min(Math.max(1, options.page ?? 1), pages);

	return { items: all.slice((page - 1) * perPage, page * perPage), total: all.length, page, perPage };
}

export async function readCase(guildId: string, number: number): Promise<ModCase> {
	const stored = await findCase(guildId, number);
	if (stored === null) throw new UserFacingError(`There is no case ${String(number)} in this server.`);
	return toModCase(stored);
}

export async function readCaseSettings(guild: Guild): Promise<CaseSettings> {
	const logChannelId = (await getCaseSettings(guild.id))?.logChannelId ?? null;
	return { logChannelId, canSend: logChannelId !== null && canPostIn(guild, logChannelId) };
}

export async function applyCaseSettings(
	guild: Guild,
	logChannelId: string | null,
	updatedBy: string | null,
): Promise<CaseSettings> {
	if (logChannelId !== null && !canPostIn(guild, logChannelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}
	await saveCaseSettings(guild.id, logChannelId, updatedBy);
	return readCaseSettings(guild);
}
