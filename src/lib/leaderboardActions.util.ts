import { type AttachmentBuilder, type Guild } from "discord.js";
import { countAccounts, getEconomyRank, getLeaderboard } from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getRank } from "@database/repositories/levelRepository";
import { type BoardRow, renderBoardImage } from "@lib/boardCard.util";
import { formatNumber, ordinal } from "@lib/format.util";

/**
 * The leaderboards, shared by `/leaderboard` and by its paging buttons so the
 * first page and every later one are drawn by the same code.
 *
 * Both boards are one command rather than one per system: the levelling board used
 * to sit under the economy command as a second subcommand, which is where anyone
 * looking for it would never think to check.
 */

export const LEADERBOARD_ID = "leaderboard";
export const BOARD_KINDS = ["economy", "levels"] as const;
export type BoardKind = (typeof BOARD_KINDS)[number];

export const PAGE_SIZE = 10;

export function isBoardKind(value: string): value is BoardKind {
	return (BOARD_KINDS as readonly string[]).includes(value);
}

export function boardTitle(kind: BoardKind, guildName: string, page: number): string {
	const heading = kind === "economy" ? `Richest in ${guildName}` : `Top levels in ${guildName}`;
	return page === 0 ? heading : `${heading} — page ${page + 1}`;
}

export function emptyMessage(kind: BoardKind): string {
	return kind === "economy" ? "Nobody has an account here yet." : "Nobody has earned any XP here yet.";
}

/** Total pages, never below one, so an empty board still renders a page. */
export function pageCount(total: number): number {
	return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

interface Entry {
	userId: string;
	primary: string;
	secondary: string;
}

async function entriesFor(guild: Guild, kind: BoardKind, page: number): Promise<{ entries: Entry[]; total: number }> {
	const skip = page * PAGE_SIZE;

	if (kind === "economy") {
		const [rows, total] = await Promise.all([
			getLeaderboard(guild.id, PAGE_SIZE, "total", skip),
			countAccounts(guild.id),
		]);

		return {
			total,
			entries: rows.map((row) => ({
				userId: row.userId,
				primary: formatNumber(row.total),
				secondary: `${formatNumber(row.bank)} banked`,
			})),
		};
	}

	const [rows, total] = await Promise.all([getLevelLeaderboard(guild.id, PAGE_SIZE, skip), countRanked(guild.id)]);

	return {
		total,
		entries: rows.map((row) => ({
			userId: row.userId,
			primary: `Level ${formatNumber(row.level)}`,
			secondary: `${formatNumber(row.xp)} XP`,
		})),
	};
}

/**
 * Names and avatars come from one bulk member fetch rather than one request each.
 * Someone who has since left the server keeps their place with their ID as a name —
 * dropping them would renumber everyone below.
 */
async function decorate(guild: Guild, entries: Entry[], page: number): Promise<BoardRow[]> {
	// Cache first, and only fetch what is genuinely missing: the handler answers the
	// interaction directly rather than deferring, so this has to stay well inside
	// Discord's three-second window.
	const missing = entries.map((entry) => entry.userId).filter((id) => !guild.members.cache.has(id));
	if (missing.length > 0) await guild.members.fetch({ user: missing }).catch(() => null);

	return entries.map((entry, index) => {
		const member = guild.members.cache.get(entry.userId) ?? null;

		return {
			rank: page * PAGE_SIZE + index + 1,
			displayName: member?.displayName ?? `Left the server (${entry.userId.slice(0, 6)}…)`,
			avatarUrl: member?.displayAvatarURL({ extension: "png", size: 128 }) ?? "",
			primary: entry.primary,
			secondary: entry.secondary,
		};
	});
}

export interface BoardMessage {
	content: string;
	files: AttachmentBuilder[];
}

/**
 * One board, as an image and a line of text. **Deliberately has no buttons.**
 *
 * It used to page and swap boards from buttons, but every re-render left the
 * previous image attached and added the new one beside it, so a few presses turned
 * the message into a grid of four boards. Three fixes — a deferred `editReply`,
 * an `update`, and a direct `Message#edit`, each explicitly listing the
 * attachments to keep — all failed against the live API.
 *
 * A message that is never edited cannot accumulate anything, so the page is a
 * command option instead. Less clever, and it works.
 */
export async function boardMessage(
	guild: Guild,
	kind: BoardKind,
	page: number,
	viewerId: string,
): Promise<BoardMessage> {
	const { entries, total } = await entriesFor(guild, kind, page);
	const rows = await decorate(guild, entries, page);
	const image = await renderBoardImage(boardTitle(kind, guild.name, page), rows, emptyMessage(kind));

	return { content: footerFor(kind, page, pageCount(total), await rankOf(guild, kind, viewerId)), files: [image] };
}

/**
 * The line under the board: where the viewer sits, and how to reach the rest.
 * This is what the Find me and paging buttons used to do.
 */
export function footerFor(kind: BoardKind, page: number, pages: number, rank: number | null): string {
	const where =
		rank === null
			? "-# You are not on this board yet."
			: `-# You are **${ordinal(rank)}**${pageOfRank(rank) === page ? " — on this page." : `, on page ${pageOfRank(rank) + 1}.`}`;

	const more =
		pages > 1 ? `\n-# Page **${page + 1}** of **${pages}** — \`/leaderboard ${kind} page:2\` for the next.` : "";

	return `${where}${more}`;
}

/** The other board, for the button that swaps between them. */
export function otherKind(kind: BoardKind): BoardKind {
	return kind === "economy" ? "levels" : "economy";
}

/** Which page someone at this rank is on. Rank 1 is on page 0. */
export function pageOfRank(rank: number): number {
	return Math.max(0, Math.ceil(rank / PAGE_SIZE) - 1);
}

/** Where the viewer sits, so "Find me" can jump straight there. */
export async function rankOf(guild: Guild, kind: BoardKind, userId: string): Promise<number | null> {
	return kind === "economy" ? getEconomyRank(guild.id, userId) : getRank(guild.id, userId);
}
