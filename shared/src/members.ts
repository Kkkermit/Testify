import { z } from "zod";

export const MEMBER_BOARDS = ["economy", "levels"] as const;

export type MemberBoard = (typeof MEMBER_BOARDS)[number];

export const BOARD_PAGE_SIZE = 25;

export const MONEY_SORTS = ["total", "wallet", "bank"] as const;

export type MoneySort = (typeof MONEY_SORTS)[number];

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
	sort: MoneySort;
	scope: BoardScope;
	page: number;
	pages: number;
	total: number;
	rows: BoardRow[];
	you: { rank: number; page: number } | null;
}

export const boardQuery = z.object({
	board: z.enum(MEMBER_BOARDS).default("economy"),
	page: z.coerce.number().int().min(1).default(1),
	sort: z.enum(MONEY_SORTS).default("total"),
	scope: z.enum(BOARD_SCOPES).default("server"),
});

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
