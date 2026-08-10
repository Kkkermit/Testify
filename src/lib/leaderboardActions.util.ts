import { type AttachmentBuilder, type Guild } from "discord.js";
import { type BoardRow, renderBoardImage } from "@lib/boardCard.util";
import { formatNumber, ordinal } from "@lib/format.util";
import { boardEntries, rankOnBoard } from "@lib/memberActions.util";

/**
 * The leaderboards, shared by `/leaderboard` and by its paging buttons so the first page and every later one are
 * drawn by the same code.
 */

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
	const { entries, total } = await boardEntries(guild.id, kind, { limit: PAGE_SIZE, skip: page * PAGE_SIZE });

	return {
		total,
		entries: entries.map((entry) => ({
			userId: entry.userId,
			primary: kind === "economy" ? formatNumber(entry.primary) : `Level ${formatNumber(entry.primary)}`,
			secondary: kind === "economy" ? `${formatNumber(entry.secondary)} banked` : `${formatNumber(entry.secondary)} XP`,
		})),
	};
}

/** Names and avatars come from one bulk member fetch rather than one request each. */
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

/** One board, as an image and a line of text. */
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

/** The line under the board: where the viewer sits, and how to reach the rest. */
export function footerFor(kind: BoardKind, page: number, pages: number, rank: number | null): string {
	const where =
		rank === null
			? "-# You are not on this board yet."
			: `-# You are **${ordinal(rank)}**${pageOfRank(rank) === page ? " — on this page." : `, on page ${pageOfRank(rank) + 1}.`}`;

	const more =
		pages > 1 ? `\n-# Page **${page + 1}** of **${pages}** — \`/leaderboard ${kind} page:2\` for the next.` : "";

	return `${where}${more}`;
}

export function pageOfRank(rank: number): number {
	return Math.max(0, Math.ceil(rank / PAGE_SIZE) - 1);
}

/** Where the viewer sits, so "Find me" can jump straight there. */
export async function rankOf(guild: Guild, kind: BoardKind, userId: string): Promise<number | null> {
	return rankOnBoard(guild.id, kind, userId);
}
