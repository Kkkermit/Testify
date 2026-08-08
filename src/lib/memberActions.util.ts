import { type Guild } from "discord.js";
import { countAccounts, getEconomyRank, getLeaderboard } from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getRank } from "@database/repositories/levelRepository";
import {
	BOARD_PAGE_SIZE,
	type BoardPage,
	boardPages,
	type BoardRow,
	type MemberBoard,
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
