import { type BoardPage, MEMBER_BOARDS, type MemberBoard } from "@testify/shared";
import { type TFunction } from "i18next";
import { oneOf } from "@/lib/oneOf";

export function boardFrom(value: string | null): MemberBoard {
	return oneOf(MEMBER_BOARDS, value, "economy");
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

export function emptyMessage(board: MemberBoard, t: TFunction): string {
	return t(board === "economy" ? "members.noAccounts" : "members.noXp");
}

export function summarise(data: BoardPage, t: TFunction): string {
	if (data.total === 0) return emptyMessage(data.board, t);

	return t(data.board === "economy" ? "members.ranked" : "members.rankedMembers", { count: data.total });
}
