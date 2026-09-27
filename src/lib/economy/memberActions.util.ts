import { type Guild, type GuildMember } from "discord.js";
import { type Logger } from "@core/logger";
import {
	adjustBank,
	adjustWallet,
	countAccounts,
	countGlobalAccounts,
	findAccount,
	getEconomyRank,
	getGlobalLeaderboard,
	getGlobalRank,
	getLeaderboard,
} from "@database/repositories/economyRepository";
import {
	addXp,
	countRanked,
	getLevelLeaderboard,
	getLevelSettings,
	getRank,
	getUserLevel,
	setLevel,
} from "@database/repositories/levelRepository";
import { deactivateSoftban, getActiveSoftban, getWarnings } from "@database/repositories/moderationRepository";
import { type RewardOutcome } from "@lib/levelling/levelling.types";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import { applyLevelRewards } from "@lib/levelling/levellingActions.util";
import { moderationProblem } from "@lib/moderation/moderationActions.util";
import {
	BOARD_PAGE_SIZE,
	type BoardPage,
	boardPages,
	type BoardRow,
	type BoardScope,
	type MemberBoard,
	type MemberDetail,
	type MemberWarning,
	type MoneyPurse,
	type MoneySort,
	pageOfRank,
	storedStep,
} from "@testify/shared";

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

export async function rankOnBoard(
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

/**
 * Names and avatars come from one bulk member fetch; on the bot-wide board, somebody who was never in this server is
 * named from their Discord profile instead.
 */
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

function toWarning(entry: {
	warnId: string;
	reason: string;
	executorId: string;
	executorTag: string;
	timestamp: Date;
	edits?: unknown[];
	step?: string | null;
	stepProblem?: string | null;
}): MemberWarning {
	return {
		id: entry.warnId,
		reason: entry.reason,
		byId: entry.executorId,
		byTag: entry.executorTag,
		at: entry.timestamp.toISOString(),
		edited: (entry.edits ?? []).length > 0,
		...storedStep(entry.step, entry.stepProblem),
	};
}

/** Everything one member's page shows, in one read; `member` is null once they leave, and every section survives it. */
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

/** Lifts a softban early: the Discord ban first, because the record is what the sweep job reads. */
export async function revokeSoftban(guild: Guild, userId: string, byName: string): Promise<boolean> {
	if ((await getActiveSoftban(guild.id, userId)) === null) return false;

	await guild.bans.remove(userId, `Softban lifted early by ${byName}`).catch(() => null);

	return deactivateSoftban(guild.id, userId);
}

export interface LevelChange {
	level: number;
	xp: number;
	rewards: RewardOutcome;
}

/** Sets a level or moves XP, then hands out whatever role rewards the new level earns. */
export async function changeLevel(
	guild: Guild,
	member: GuildMember,
	change: { level?: number; xp?: number },
	logger?: Logger,
): Promise<LevelChange> {
	const record =
		change.level === undefined
			? await addXp(guild.id, member.id, change.xp ?? 0)
			: await setLevel(guild.id, member.id, change.level);

	const config = normaliseSettings(await getLevelSettings(guild.id));

	return { level: record.level, xp: record.xp, rewards: await applyLevelRewards(member, config, record.level, logger) };
}

/** Money is `$inc`-ed rather than read and written back, so two managers cannot overwrite each other's change. */
export async function changeMoney(
	guildId: string,
	userId: string,
	purse: MoneyPurse,
	delta: number,
): Promise<{ wallet: number; bank: number }> {
	const account =
		purse === "wallet" ? await adjustWallet(guildId, userId, delta) : await adjustBank(guildId, userId, delta);

	return { wallet: account.wallet, bank: account.bank };
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
