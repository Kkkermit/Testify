import { type Guild, type GuildMember } from "discord.js";
import { findAccount, getEconomyRank, countAccounts, getLeaderboard } from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getRank, getUserLevel } from "@database/repositories/levelRepository";
import { getActiveSoftban, getWarnings } from "@database/repositories/moderationRepository";
import { moderationProblem } from "@lib/moderationActions.util";
import {
	BOARD_PAGE_SIZE,
	type BoardPage,
	boardPages,
	type BoardRow,
	type MemberBoard,
	type MemberDetail,
	type MemberWarning,
	pageOfRank,
} from "@testify/shared";

export interface BoardEntry {
	userId: string;
	primary: number;
	secondary: number;
}

/** One slice of a board as plain numbers, shared by the canvas leaderboard and the dashboard table. */
export async function boardEntries(
	guildId: string,
	board: MemberBoard,
	window: { limit: number; skip: number },
): Promise<{ entries: BoardEntry[]; total: number }> {
	if (board === "economy") {
		const [rows, total] = await Promise.all([
			getLeaderboard(guildId, window.limit, "total", window.skip),
			countAccounts(guildId),
		]);

		return {
			total,
			entries: rows.map((row) => ({ userId: row.userId, primary: row.total, secondary: row.bank })),
		};
	}

	const [rows, total] = await Promise.all([
		getLevelLeaderboard(guildId, window.limit, window.skip),
		countRanked(guildId),
	]);

	return { total, entries: rows.map((row) => ({ userId: row.userId, primary: row.level, secondary: row.xp })) };
}

export async function rankOnBoard(guildId: string, board: MemberBoard, userId: string): Promise<number | null> {
	return board === "economy" ? getEconomyRank(guildId, userId) : getRank(guildId, userId);
}

/** Names and avatars come from one bulk fetch rather than a request per row. */
export async function decorateRows(guild: Guild, entries: BoardEntry[], firstRank: number): Promise<BoardRow[]> {
	const missing = entries.map((entry) => entry.userId).filter((id) => !guild.members.cache.has(id));
	if (missing.length > 0) await guild.members.fetch({ user: missing }).catch(() => null);

	return entries.map((entry, index) => {
		const member = guild.members.cache.get(entry.userId) ?? null;

		return {
			userId: entry.userId,
			rank: firstRank + index,
			displayName: member?.displayName ?? "Left the server",
			avatarUrl: member?.displayAvatarURL({ extension: "png", size: 64 }) ?? null,
			primary: entry.primary,
			secondary: entry.secondary,
			inGuild: member !== null,
		};
	});
}

function toWarning(entry: {
	warnId: string;
	reason: string;
	executorId: string;
	executorTag: string;
	timestamp: Date;
	edits?: unknown[];
}): MemberWarning {
	return {
		id: entry.warnId,
		reason: entry.reason,
		byId: entry.executorId,
		byTag: entry.executorTag,
		at: entry.timestamp.toISOString(),
		edited: (entry.edits ?? []).length > 0,
	};
}

/**
 * Everything one member's page shows, in one read.
 *
 * `member` is null once somebody leaves, and every section survives that: warnings, balance and XP all outlive
 * the membership, so the page names them rather than answering 404.
 */
export async function readMemberDetail(options: {
	guild: Guild;
	userId: string;
	member: GuildMember | null;
	moderator: GuildMember | null;
	botId: string | undefined;
}): Promise<MemberDetail> {
	const { guild, userId, member, moderator, botId } = options;

	const [account, economyRank, level, levelRank, warnings, softban] = await Promise.all([
		findAccount(guild.id, userId),
		getEconomyRank(guild.id, userId),
		getUserLevel(guild.id, userId),
		getRank(guild.id, userId),
		getWarnings(guild.id, userId),
		getActiveSoftban(guild.id, userId),
	]);

	return {
		userId,
		displayName: member?.displayName ?? warnings?.userTag ?? "Left the server",
		username: member?.user.username ?? warnings?.userTag ?? userId,
		avatarUrl: member?.displayAvatarURL({ extension: "png", size: 128 }) ?? null,
		inGuild: member !== null,
		isBot: member?.user.bot ?? false,
		joinedAt: member?.joinedAt?.toISOString() ?? null,
		roles:
			member === null
				? []
				: [...member.roles.cache.values()]
						.filter((role) => role.id !== guild.id)
						.sort((a, b) => b.position - a.position)
						.map((role) => ({
							id: role.id,
							name: role.name,
							colour: role.hexColor === "#000000" ? null : role.hexColor,
						})),
		economy:
			account === null
				? null
				: {
						wallet: account.wallet,
						bank: account.bank,
						total: account.wallet + account.bank,
						rank: economyRank,
					},
		levels: level === null ? null : { level: level.level, xp: level.xp, rank: levelRank },
		warnings: (warnings?.warnings ?? []).map(toWarning).reverse(),
		softban:
			softban === null
				? null
				: {
						reason: softban.reason,
						moderatorId: softban.moderatorId,
						expiresAt: softban.expiresAt.toISOString(),
					},
		// A member who has left cannot be acted on through Discord, and neither can one the caller sits below.
		moderationProblem:
			member === null
				? "They are no longer in this server."
				: moderator === null
					? "Only somebody in this server can moderate its members."
					: moderationProblem(moderator, member, botId),
	};
}

export async function readBoard(guild: Guild, board: MemberBoard, page: number, viewerId: string): Promise<BoardPage> {
	const skip = (page - 1) * BOARD_PAGE_SIZE;
	const [{ entries, total }, rank] = await Promise.all([
		boardEntries(guild.id, board, { limit: BOARD_PAGE_SIZE, skip }),
		rankOnBoard(guild.id, board, viewerId),
	]);

	return {
		board,
		page,
		pages: boardPages(total),
		total,
		rows: await decorateRows(guild, entries, skip + 1),
		you: rank === null ? null : { rank, page: pageOfRank(rank) },
	};
}
