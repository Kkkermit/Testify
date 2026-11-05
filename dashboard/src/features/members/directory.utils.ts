import {
	DIRECTORY_JOINED,
	DIRECTORY_KINDS,
	DIRECTORY_LIMITS,
	type BulkSkip,
	type DirectoryJoined,
	type DirectoryKind,
	type DirectoryPage,
	type DirectoryRow,
} from "@testify/shared";
import { type TranslationKey } from "@/i18n";
import { oneOf } from "@/lib/oneOf";

export const MEMBER_TABS = ["directory", "boards"] as const;

export type MemberTab = (typeof MEMBER_TABS)[number];

/** A `?board=` link from before the directory still opens the boards. */
export function tabFrom(tab: string | null, board: string | null): MemberTab {
	if (tab === null) return board === null ? "directory" : "boards";
	return oneOf(MEMBER_TABS, tab, "directory");
}

export interface DirectoryFilters {
	q: string;
	roleId: string;
	joined: DirectoryJoined;
	kind: DirectoryKind;
	timedOut: boolean;
	warned: boolean;
}

export function filtersFrom(params: URLSearchParams): DirectoryFilters {
	return {
		q: (params.get("q") ?? "").slice(0, DIRECTORY_LIMITS.maxQuery),
		roleId: /^\d{17,20}$/.test(params.get("role") ?? "") ? (params.get("role") ?? "") : "",
		joined: oneOf(DIRECTORY_JOINED, params.get("joined"), "any"),
		kind: oneOf(DIRECTORY_KINDS, params.get("kind"), "all"),
		timedOut: params.get("timedOut") === "1",
		warned: params.get("warned") === "1",
	};
}

/** What the API is asked for, with the defaults left out so equal filters make one cache entry. */
export function directorySearch(filters: DirectoryFilters, after: string | null): string {
	const query = new URLSearchParams();
	if (filters.q.trim() !== "") query.set("q", filters.q.trim());
	if (filters.roleId !== "") query.set("roleId", filters.roleId);
	if (filters.joined !== "any") query.set("joined", filters.joined);
	if (filters.kind !== "all") query.set("kind", filters.kind);
	if (filters.timedOut) query.set("timedOut", "1");
	if (filters.warned) query.set("warned", "1");
	if (after !== null) query.set("after", after);
	return query.toString();
}

export const JOINED_LABELS: Record<DirectoryJoined, TranslationKey> = {
	any: "directory.joinedAny",
	day: "directory.joinedDay",
	week: "directory.joinedWeek",
	month: "directory.joinedMonth",
};

export const KIND_LABELS: Record<DirectoryKind, TranslationKey> = {
	all: "directory.kindAll",
	people: "directory.kindPeople",
	bots: "directory.kindBots",
};

export const SKIP_LABELS: Record<BulkSkip, TranslationKey> = {
	you: "directory.skipYou",
	owner: "directory.skipOwner",
	bot: "directory.skipBot",
	outranked: "directory.skipOutranked",
	botOutranked: "directory.skipBotOutranked",
	notMember: "directory.skipNotMember",
	left: "directory.skipLeft",
	already: "directory.skipAlready",
	failed: "directory.skipFailed",
};

export type MemberAction = "give" | "take" | "timeout" | "warn" | "kick" | "ban";

export const ACTION_LABELS: Record<MemberAction, TranslationKey> = {
	give: "directory.give",
	take: "directory.take",
	timeout: "directory.timeout",
	warn: "directory.warn",
	kick: "directory.kick",
	ban: "directory.ban",
};

const BULK_ACTIONS: readonly MemberAction[] = ["give", "take", "timeout", "kick", "ban"];

/** The reader, the owner and the bot are never acted on, whatever the action. */
function untouchable(row: DirectoryRow): boolean {
	return row.block === "you" || row.block === "owner" || row.block === "bot";
}

function allowed(action: MemberAction, page: DirectoryPage): boolean {
	if (action === "give" || action === "take") return page.can.roles && page.grantable.length > 0;
	return page.can[action];
}

/** What a row offers: roles to anybody but the untouchable three, the rest only to somebody the reader outranks. */
export function rowActions(row: DirectoryRow, page: DirectoryPage): MemberAction[] {
	return (["give", "take", "timeout", "warn", "kick", "ban"] as const).filter((action) => {
		if (!allowed(action, page)) return false;
		if (action === "give" || action === "take") return !untouchable(row);
		if (action === "warn" && row.isBot) return false;
		return row.block === null;
	});
}

export function bulkActions(page: DirectoryPage): MemberAction[] {
	return BULK_ACTIONS.filter((action) => allowed(action, page));
}

/** Whether anything on the page can be acted on several at a time, which is what the tick boxes are for. */
export function selectable(page: DirectoryPage): boolean {
	return bulkActions(page).length > 0;
}

export function toggled(selected: ReadonlyMap<string, DirectoryRow>, row: DirectoryRow): Map<string, DirectoryRow> {
	const next = new Map(selected);
	if (next.has(row.userId)) next.delete(row.userId);
	else if (next.size < DIRECTORY_LIMITS.maxBatch) next.set(row.userId, row);
	return next;
}
