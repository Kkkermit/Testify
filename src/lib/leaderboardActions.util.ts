import {
	type ActionRowBuilder,
	type AttachmentBuilder,
	type ButtonBuilder,
	ButtonStyle,
	type Guild,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { customId } from "@core/button";
import { countAccounts, getEconomyRank, getLeaderboard } from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getRank } from "@database/repositories/levelRepository";
import { type BoardRow, renderBoardImage } from "@lib/boardCard.util";
import { button, navRow, row } from "@lib/components.util";
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
	const ids = entries.map((entry) => entry.userId);
	const members = ids.length === 0 ? null : await guild.members.fetch({ user: ids }).catch(() => null);

	return entries.map((entry, index) => {
		const member = members?.get(entry.userId) ?? null;

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
	files: AttachmentBuilder[];
	components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

export async function boardMessage(
	guild: Guild,
	kind: BoardKind,
	page: number,
	ownerId: string,
): Promise<BoardMessage> {
	const { entries, total } = await entriesFor(guild, kind, page);
	const rows = await decorate(guild, entries, page);
	const image = await renderBoardImage(boardTitle(kind, guild.name, page), rows, emptyMessage(kind));

	const mine = await rankOf(guild, kind, ownerId);

	return {
		files: [image],
		components: [
			navRow(LEADERBOARD_ID, page, pageCount(total), ownerId, kind),
			row(
				switchButton(kind, ownerId),
				button({
					// The "me" slot keeps this distinct from the nav arrow that happens to
					// target the same page; Discord rejects duplicate custom IDs outright.
					id:
						mine === null
							? customId(LEADERBOARD_ID, "noop", kind, page, "me", ownerId)
							: customId(LEADERBOARD_ID, "goto", kind, pageOfRank(mine), "me", ownerId),
					label: mine === null ? "You are not on this board" : `Find me — ${ordinal(mine)}`,
					// Already looking at your own page, so there is nowhere to jump to.
					disabled: mine === null || pageOfRank(mine) === page,
				}),
			),
		],
	};
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

/**
 * Swapping board is a `goto` on the other kind's first page, so the handler has one
 * action to implement rather than two that do the same thing.
 */
export function switchButton(kind: BoardKind, ownerId: string): ButtonBuilder {
	const target = otherKind(kind);

	return button({
		id: customId(LEADERBOARD_ID, "goto", target, 0, "swap", ownerId),
		label: target === "economy" ? "Richest members" : "Highest levels",
		style: ButtonStyle.Primary,
	});
}
