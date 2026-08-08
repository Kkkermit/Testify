import { type BoardPage, MEMBER_BOARDS, type MemberBoard } from "@testify/shared";

export function boardFrom(value: string | null): MemberBoard {
	return (MEMBER_BOARDS as readonly string[]).includes(value ?? "") ? (value as MemberBoard) : "economy";
}

/** A page out of range is a stale link, not an error — clamping beats an empty table with no way back. */
export function pageFrom(value: string | null): number {
	const page = Number(value);

	return Number.isInteger(page) && page > 0 ? page : 1;
}

/** The jump button only earns its place when it would actually move you. */
export function jumpTarget(data: BoardPage): number | null {
	return data.you === null || data.you.page === data.page ? null : data.you.page;
}

export function emptyMessage(board: MemberBoard): string {
	return board === "economy" ? "Nobody has an account here yet." : "Nobody has earned any XP here yet.";
}

export function summarise(data: BoardPage): string {
	if (data.total === 0) return emptyMessage(data.board);

	const noun = data.board === "economy" ? "account" : "member";

	return `${data.total.toLocaleString()} ${noun}${data.total === 1 ? "" : "s"} ranked.`;
}
