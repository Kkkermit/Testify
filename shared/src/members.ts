import { z } from "zod";

export const MEMBER_BOARDS = ["economy", "levels"] as const;

export type MemberBoard = (typeof MEMBER_BOARDS)[number];

export const BOARD_PAGE_SIZE = 25;

/** What the money board ranks by. */
export const MONEY_SORTS = ["total", "wallet", "bank"] as const;

export type MoneySort = (typeof MONEY_SORTS)[number];

/** One server, or every server the bot is in, where a person's balances are added together. */
export const BOARD_SCOPES = ["server", "global"] as const;

export type BoardScope = (typeof BOARD_SCOPES)[number];

export interface BoardRow {
	userId: string;
	rank: number;
	displayName: string;
	avatarUrl: string | null;
	/** The number the board is sorted by, and the one beside it — already formatted for display. */
	primary: number;
	secondary: number;
	/** False once somebody leaves, or on the bot-wide board for somebody who was never here. */
	inGuild: boolean;
}

export interface BoardPage {
	board: MemberBoard;
	/** Only the money board is ranked by anything but its one figure, or across servers. */
	sort: MoneySort;
	scope: BoardScope;
	page: number;
	pages: number;
	total: number;
	rows: BoardRow[];
	/** Where the person reading sits, so the page can offer to jump there. */
	you: { rank: number; page: number } | null;
}

export const boardQuery = z.object({
	board: z.enum(MEMBER_BOARDS).default("economy"),
	page: z.coerce.number().int().min(1).default(1),
	sort: z.enum(MONEY_SORTS).default("total"),
	scope: z.enum(BOARD_SCOPES).default("server"),
});

/** The money board's two figures for each sort: the one it ranks by first. */
export const MONEY_SORT_LABELS: Record<MoneySort, { heading: string; primary: string; secondary: string }> = {
	total: { heading: "Richest", primary: "Total", secondary: "Banked" },
	wallet: { heading: "Biggest wallets", primary: "Wallet", secondary: "Banked" },
	bank: { heading: "Biggest banks", primary: "Bank", secondary: "Wallet" },
};

/** Total pages, never below one, so an empty board still has a page to render. */
export function boardPages(total: number): number {
	return Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE));
}

/** Which page somebody at this rank is on, one-based to match the query. */
export function pageOfRank(rank: number): number {
	return Math.max(1, Math.ceil(rank / BOARD_PAGE_SIZE));
}
