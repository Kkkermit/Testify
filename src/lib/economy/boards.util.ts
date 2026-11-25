import { type Guild } from "discord.js";
import {
	countAccounts,
	countGlobalAccounts,
	getEconomyRank,
	getEconomyStanding,
	getGlobalLeaderboard,
	getGlobalRank,
	getGlobalStanding,
	getLeaderboard,
} from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getLevelStanding, getRank } from "@database/repositories/levelRepository";
import {
	BOARD_PAGE_SIZE,
	type BoardPage,
	boardPages,
	type BoardRow,
	type BoardScope,
	type MemberBoard,
	type MoneySort,
	pageOfRank,
} from "@testify/shared";

/** The leaderboards as numbers: a slice of one, somebody's own place on it, and the names and faces beside each row. */

export interface BoardEntry {
	userId: string;
	primary: number;
	secondary: number;
}

/** How the money board is cut: ranked by which figure, and over one server or every one the bot is in. */
export interface BoardView {
	sort: MoneySort;
	scope: BoardScope;
	/** The servers the bot is in, which the bot-wide board adds up; a server it has left no longer counts. */
	guildIds: readonly string[];
}

export const SERVER_TOTALS: BoardView = { sort: "total", scope: "server", guildIds: [] };

/** The figure a money row is ranked by, and the one shown beside it. */
function moneyEntry(row: { userId: string; wallet: number; bank: number; total: number }, sort: MoneySort): BoardEntry {
	return { userId: row.userId, primary: row[sort], secondary: sort === "bank" ? row.wallet : row.bank };
}

/** One slice of a board as plain numbers, shared by the canvas leaderboard and the dashboard table. */
export async function boardEntries(
	guildId: string,
	board: MemberBoard,
	window: { limit: number; skip: number },
	view: BoardView = SERVER_TOTALS,
): Promise<{ entries: BoardEntry[]; total: number }> {
	if (board === "economy" && view.scope === "global") {
		const [rows, total] = await Promise.all([
			getGlobalLeaderboard(view.guildIds, window.limit, view.sort, window.skip),
			countGlobalAccounts(view.guildIds),
		]);

		return { total, entries: rows.map((row) => moneyEntry(row, view.sort)) };
	}

	if (board === "economy") {
		const [rows, total] = await Promise.all([
			getLeaderboard(guildId, window.limit, view.sort, window.skip),
			countAccounts(guildId),
		]);

		return { total, entries: rows.map((row) => moneyEntry(row, view.sort)) };
	}

	const [rows, total] = await Promise.all([
		getLevelLeaderboard(guildId, window.limit, window.skip),
		countRanked(guildId),
	]);

	return { total, entries: rows.map((row) => ({ userId: row.userId, primary: row.level, secondary: row.xp })) };
}

async function rankOnBoard(
	guildId: string,
	board: MemberBoard,
	userId: string,
	view: BoardView = SERVER_TOTALS,
): Promise<number | null> {
	if (board === "levels") return getRank(guildId, userId);

	return view.scope === "global"
		? getGlobalRank(view.guildIds, userId, view.sort)
		: getEconomyRank(guildId, userId, view.sort);
}

/** Somebody's own row on a board, with the rank that goes beside it; null when they are not on it. */
export async function standingOnBoard(
	guildId: string,
	board: MemberBoard,
	userId: string,
	view: BoardView = SERVER_TOTALS,
): Promise<{ rank: number; entry: BoardEntry } | null> {
	if (board === "levels") {
		const standing = await getLevelStanding(guildId, userId);
		return standing === null
			? null
			: { rank: standing.rank, entry: { userId, primary: standing.level, secondary: standing.xp } };
	}

	const standing =
		view.scope === "global"
			? await getGlobalStanding(view.guildIds, userId, view.sort)
			: await getEconomyStanding(guildId, userId, view.sort);
	return standing === null ? null : { rank: standing.rank, entry: moneyEntry(standing, view.sort) };
}

/** Names and avatars come from one bulk member fetch, and somebody never in this server from their Discord profile. */
export async function decorateRows(
	guild: Guild,
	entries: BoardEntry[],
	firstRank: number,
	scope: BoardScope = "server",
): Promise<BoardRow[]> {
	const missing = entries.map((entry) => entry.userId).filter((id) => !guild.members.cache.has(id));
	if (missing.length > 0) await guild.members.fetch({ user: missing }).catch(() => null);

	const strangers = new Map(
		scope === "global"
			? await Promise.all(
					entries
						.filter((entry) => !guild.members.cache.has(entry.userId))
						.map(
							async (entry) => [entry.userId, await guild.client.users.fetch(entry.userId).catch(() => null)] as const,
						),
				)
			: [],
	);

	return entries.map((entry, index) => {
		const member = guild.members.cache.get(entry.userId) ?? null;
		const user = strangers.get(entry.userId) ?? null;

		return {
			userId: entry.userId,
			rank: firstRank + index,
			displayName:
				member?.displayName ?? user?.displayName ?? (scope === "global" ? "Unknown user" : "Left the server"),
			avatarUrl:
				member?.displayAvatarURL({ extension: "png", size: 64 }) ??
				user?.displayAvatarURL({ extension: "png", size: 64 }) ??
				null,
			primary: entry.primary,
			secondary: entry.secondary,
			inGuild: member !== null,
		};
	});
}

export async function readBoard(
	guild: Guild,
	board: MemberBoard,
	page: number,
	viewerId: string,
	view: BoardView = SERVER_TOTALS,
): Promise<BoardPage> {
	const skip = (page - 1) * BOARD_PAGE_SIZE;
	// The levels board has one figure and one server, so a sort or scope asked of it is ignored rather than refused.
	const cut = board === "economy" ? view : SERVER_TOTALS;
	const [{ entries, total }, rank] = await Promise.all([
		boardEntries(guild.id, board, { limit: BOARD_PAGE_SIZE, skip }, cut),
		rankOnBoard(guild.id, board, viewerId, cut),
	]);

	return {
		board,
		sort: cut.sort,
		scope: cut.scope,
		page,
		pages: boardPages(total),
		total,
		rows: await decorateRows(guild, entries, skip + 1, cut.scope),
		you: rank === null ? null : { rank, page: pageOfRank(rank) },
	};
}
