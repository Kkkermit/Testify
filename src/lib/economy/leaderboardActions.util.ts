import { type AttachmentBuilder, type Guild } from "discord.js";
import { renderBoardImage } from "@lib/canvas/boardCard.util";
import { pageCount } from "@lib/discord/pagination.util";
import { type BoardKind } from "@lib/economy/economy.types";
import {
	type BoardEntry,
	boardEntries,
	type BoardView,
	decorateRows,
	rankOnBoard,
	SERVER_TOTALS,
} from "@lib/economy/memberActions.util";
import { formatNumber, ordinal } from "@lib/format/format.util";
import { type BoardScope, MONEY_SORT_LABELS, type MoneySort } from "@testify/shared";

/** The leaderboards as an image and a line of text, one message per request. */

export const PAGE_SIZE = 10;

/** Which board, which page, and for money, ranked by what and over which servers. */
export interface BoardState {
	kind: BoardKind;
	page: number;
	sort: MoneySort;
	scope: BoardScope;
}

export function boardTitle(state: BoardState, guildName: string): string {
	const heading =
		state.kind === "levels"
			? `Top levels in ${guildName}`
			: `${MONEY_SORT_LABELS[state.sort].heading} ${state.scope === "global" ? "across every server" : `in ${guildName}`}`;

	return state.page === 0 ? heading : `${heading} — page ${state.page + 1}`;
}

export function emptyMessage(kind: BoardKind, scope: BoardScope = "server"): string {
	if (kind === "levels") return "Nobody has earned any XP here yet.";

	return scope === "global" ? "Nobody has an account anywhere yet." : "Nobody has an account here yet.";
}

function describeMoney(entry: BoardEntry, sort: MoneySort): { primary: string; secondary: string } {
	return {
		primary: formatNumber(entry.primary),
		secondary: `${formatNumber(entry.secondary)} ${sort === "bank" ? "in wallet" : "banked"}`,
	};
}

export interface BoardMessage {
	content: string;
	files: AttachmentBuilder[];
}

/** One board, as an image and a line of text; the bot-wide board adds up the servers in `guildIds`. */
export async function boardMessage(
	guild: Guild,
	state: BoardState,
	viewerId: string,
	guildIds: readonly string[],
): Promise<BoardMessage> {
	const view: BoardView = state.kind === "economy" ? { sort: state.sort, scope: state.scope, guildIds } : SERVER_TOTALS;
	const [{ entries, total }, rank] = await Promise.all([
		boardEntries(guild.id, state.kind, { limit: PAGE_SIZE, skip: state.page * PAGE_SIZE }, view),
		rankOnBoard(guild.id, state.kind, viewerId, view),
	]);

	const rows = await decorateRows(guild, entries, state.page * PAGE_SIZE + 1, view.scope);
	const image = await renderBoardImage(
		boardTitle(state, guild.name),
		rows.map((row, index) => ({
			rank: row.rank,
			displayName: row.displayName,
			avatarUrl: row.avatarUrl ?? "",
			...(state.kind === "economy"
				? describeMoney(entries[index]!, state.sort)
				: { primary: `Level ${formatNumber(row.primary)}`, secondary: `${formatNumber(row.secondary)} XP` }),
		})),
		emptyMessage(state.kind, view.scope),
	);

	return { content: footerFor(state, pageCount(total, PAGE_SIZE), rank), files: [image] };
}

/** The options that reproduce this board, so the next-page hint keeps the reader's sort and scope. */
function optionsOf(state: BoardState): string {
	if (state.kind === "levels") return "";

	return `${state.sort === "total" ? "" : ` sort:${state.sort}`}${state.scope === "global" ? " scope:global" : ""}`;
}

/** The line under the board: where the viewer sits, and how to reach the rest. */
export function footerFor(state: BoardState, pages: number, rank: number | null): string {
	const where =
		rank === null
			? "-# You are not on this board yet."
			: `-# You are **${ordinal(rank)}**${pageOfRank(rank) === state.page ? " — on this page." : `, on page ${pageOfRank(rank) + 1}.`}`;

	const next = state.page + 2;
	const more =
		pages <= 1
			? ""
			: next <= pages
				? `\n-# Page **${state.page + 1}** of **${pages}** — \`/leaderboard ${state.kind}${optionsOf(state)} page:${next}\` for the next.`
				: `\n-# Page **${state.page + 1}** of **${pages}**, the last.`;

	return `${where}${more}`;
}

export function pageOfRank(rank: number): number {
	return Math.max(0, Math.ceil(rank / PAGE_SIZE) - 1);
}
