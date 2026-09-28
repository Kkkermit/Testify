import {
	BOARD_SCOPES,
	type BoardPage,
	type BoardScope,
	MEMBER_BOARDS,
	type MemberBoard,
	MONEY_SORTS,
	type MoneySort,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { type TranslationKey } from "@/i18n";
import { oneOf } from "@/lib/oneOf";

export function boardFrom(value: string | null): MemberBoard {
	return oneOf(MEMBER_BOARDS, value, "economy");
}

export function sortFrom(value: string | null): MoneySort {
	return oneOf(MONEY_SORTS, value, "total");
}

export function scopeFrom(value: string | null): BoardScope {
	return oneOf(BOARD_SCOPES, value, "server");
}

export const BOARD_NAMES: Record<MemberBoard, TranslationKey> = {
	economy: "members.boardEconomy",
	levels: "members.boardLevels",
};

export const SORT_NAMES: Record<MoneySort, TranslationKey> = {
	total: "members.total",
	wallet: "members.wallet",
	bank: "members.bank",
};

export const SCOPE_NAMES: Record<BoardScope, TranslationKey> = {
	server: "members.scopeServer",
	global: "members.scopeGlobal",
};

interface Columns {
	heading: TranslationKey;
	primary: TranslationKey;
	secondary: TranslationKey;
}

const MONEY_COLUMNS: Record<MoneySort, Columns> = {
	total: { heading: "members.boardEconomy", primary: "members.total", secondary: "members.banked" },
	wallet: { heading: "members.headingWallet", primary: "members.wallet", secondary: "members.banked" },
	bank: { heading: "members.headingBank", primary: "members.bank", secondary: "members.wallet" },
};

const LEVEL_COLUMNS: Columns = { heading: "members.boardLevels", primary: "members.level", secondary: "members.xp" };

/** The board's name and its two figures, the one it ranks by first. */
export function columnsFor(data: Pick<BoardPage, "board" | "sort">): Columns {
	return data.board === "economy" ? MONEY_COLUMNS[data.sort] : LEVEL_COLUMNS;
}

/** Only this server's members have a page here; somebody on the bot-wide board who is not has nothing to open. */
export function opensMember(data: Pick<BoardPage, "scope">, row: { inGuild: boolean }): boolean {
	return data.scope === "server" || row.inGuild;
}

/** The jump button only earns its place when it would actually move you. */
export function jumpTarget(data: BoardPage): number | null {
	return data.you === null || data.you.page === data.page ? null : data.you.page;
}

export function emptyMessage(board: MemberBoard, t: TFunction, scope: BoardScope = "server"): string {
	if (board === "levels") return t("members.noXp");

	return t(scope === "global" ? "members.noAccountsAnywhere" : "members.noAccounts");
}

export function summarise(data: BoardPage, t: TFunction): string {
	if (data.total === 0) return emptyMessage(data.board, t, data.scope);
	if (data.board === "levels") return t("members.rankedMembers", { count: data.total });

	return t(data.scope === "global" ? "members.rankedEverywhere" : "members.ranked", { count: data.total });
}
