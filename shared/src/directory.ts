import { z } from "zod";
import { MEMBER_TIMEOUT_MINUTES } from "./memberActions";
import { WARNING_LIMITS } from "./memberDetail";
import { snowflake } from "./schemas";
import { plainLine } from "./text";
import { confirmsName, WARN_LIMITS } from "./warnings";

export const DIRECTORY_LIMITS = {
	pageSize: 50,
	/** What Discord hands back for one page of members, and the most one search can match. */
	readBatch: 1_000,
	/** Members looked through for one page before it answers and offers Next instead, so a filter cannot stall. */
	maxScan: 5_000,
	/** One request can act on this many members; each is acted on in turn and answered for on its own. */
	maxBatch: 25,
	maxQuery: 32,
} as const;

export const DIRECTORY_JOINED = ["any", "day", "week", "month"] as const;

export type DirectoryJoined = (typeof DIRECTORY_JOINED)[number];

export const JOINED_WITHIN_MS: Record<Exclude<DirectoryJoined, "any">, number> = {
	day: 86_400_000,
	week: 7 * 86_400_000,
	month: 30 * 86_400_000,
};

export const DIRECTORY_KINDS = ["all", "people", "bots"] as const;

export type DirectoryKind = (typeof DIRECTORY_KINDS)[number];

const flag = z
	.enum(["0", "1"])
	.default("0")
	.transform((value) => value === "1");

export const directoryQuery = z.object({
	q: plainLine(1, DIRECTORY_LIMITS.maxQuery).optional(),
	roleId: snowflake.optional(),
	joined: z.enum(DIRECTORY_JOINED).default("any"),
	kind: z.enum(DIRECTORY_KINDS).default("all"),
	timedOut: flag,
	warned: flag,
	after: snowflake.optional(),
});

export type DirectoryQuery = z.infer<typeof directoryQuery>;

/** Why the person reading cannot moderate somebody, as a code each surface words for itself. */
export const MEMBER_BLOCKS = ["you", "owner", "bot", "outranked", "botOutranked", "notMember"] as const;

export type MemberBlock = (typeof MEMBER_BLOCKS)[number];

export interface DirectoryRole {
	id: string;
	name: string;
	colour: string | null;
}

export interface DirectoryRow {
	userId: string;
	displayName: string;
	username: string;
	avatarUrl: string | null;
	isBot: boolean;
	joinedAt: string | null;
	timedOutUntil: string | null;
	/** Highest first, without `@everyone`. */
	roleIds: string[];
	/** Null when the reader lacks Moderate Members, which `/warn list` asks. */
	warnings: number | null;
	/** Why a kick, ban, timeout or warning is not offered; null means it is. */
	block: MemberBlock | null;
}

export interface DirectoryAbilities {
	roles: boolean;
	timeout: boolean;
	warn: boolean;
	kick: boolean;
	ban: boolean;
}

export interface DirectoryPage {
	rows: DirectoryRow[];
	/** The cursor for the next page, or null at the end. */
	next: string | null;
	/** True when this page stopped looking after `maxScan` members, so Next may find more. */
	scanStopped: boolean;
	/** True when a search matched Discord's most, so a narrower one may find somebody it missed. */
	searchCut: boolean;
	memberCount: number;
	/** Every role in the server, highest first, for the filter and for naming a row's roles. */
	roles: DirectoryRole[];
	/** The roles the reader could hand out themselves, highest first. */
	grantable: string[];
	can: DirectoryAbilities;
}

const targets = z
	.array(snowflake)
	.min(1)
	.max(DIRECTORY_LIMITS.maxBatch)
	.refine((ids) => new Set(ids).size === ids.length, "lists somebody twice");

export const bulkRolesBody = z.object({ userIds: targets, roleId: snowflake, give: z.boolean() });

export type BulkRolesBody = z.infer<typeof bulkRolesBody>;

const reason = plainLine(WARNING_LIMITS.minReason, WARNING_LIMITS.maxReason);

export const bulkTimeoutBody = z.object({
	userIds: targets,
	minutes: z.union(MEMBER_TIMEOUT_MINUTES.map((minutes) => z.literal(minutes))),
	reason,
	confirm: z.string().max(64),
});

export type BulkTimeoutBody = z.infer<typeof bulkTimeoutBody>;

export const bulkKickBody = z.object({ userIds: targets, reason, confirm: z.string().max(64) });

export type BulkKickBody = z.infer<typeof bulkKickBody>;

export const bulkBanBody = bulkKickBody.extend({
	deleteDays: z.coerce.number().int().min(0).max(WARN_LIMITS.maxDeleteDays).default(0),
});

export type BulkBanBody = z.infer<typeof bulkBanBody>;

export type BulkAction = "roles" | "timeout" | "kick" | "ban";

/**
 * One member is confirmed by their username or ID, as on their own page; a kick or ban of several by typing how many.
 * Roles and a timeout of several are confirmed by the summary that names them.
 */
export function bulkConfirmed(
	action: BulkAction,
	typed: string,
	targets: readonly { userId: string; username: string }[],
): boolean {
	if (action === "roles") return true;

	const [only] = targets;
	if (targets.length === 1 && only !== undefined) return confirmsName(typed, only.username, only.userId);
	if (action === "timeout") return true;

	return typed.trim() === String(targets.length);
}

/** What stopped one member being acted on; `MemberBlock` plus what can only be known by trying. */
export type BulkSkip = MemberBlock | "left" | "already" | "failed";

export interface BulkOutcome {
	userId: string;
	username: string | null;
	skipped: BulkSkip | null;
}

export interface BulkResult {
	outcomes: BulkOutcome[];
}
