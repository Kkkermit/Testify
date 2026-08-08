import { z } from "zod";

export const MEMBER_BOARDS = ["economy", "levels"] as const;

export type MemberBoard = (typeof MEMBER_BOARDS)[number];

export const BOARD_PAGE_SIZE = 25;

export interface BoardRow {
	userId: string;
	rank: number;
	displayName: string;
	avatarUrl: string | null;
	/** The number the board is sorted by, and the one beside it — already formatted for display. */
	primary: number;
	secondary: number;
	/** False once somebody leaves; their row stays, because their balance and XP do. */
	inGuild: boolean;
}

export interface BoardPage {
	board: MemberBoard;
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
});

export type BoardQuery = z.infer<typeof boardQuery>;

export const BOARD_LABELS: Record<MemberBoard, { heading: string; primary: string; secondary: string }> = {
	economy: { heading: "Richest", primary: "Total", secondary: "Banked" },
	levels: { heading: "Top levels", primary: "Level", secondary: "XP" },
};

/** Total pages, never below one, so an empty board still has a page to render. */
export function boardPages(total: number): number {
	return Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE));
}

/** Which page somebody at this rank is on, one-based to match the query. */
export function pageOfRank(rank: number): number {
	return Math.max(1, Math.ceil(rank / BOARD_PAGE_SIZE));
}
