import { z } from "zod";
import { type Paged } from "./api";
import { plainLine } from "./text";

/** A server's recent changes: what managers did on the dashboard and what Discord's own audit log recorded. */

export const CHANGE_LIMITS = {
	/** How far back a search reaches. */
	maxDays: 14,
	perPage: 25,
	/** Discord hands its audit log over a hundred entries at a time, so a busy server is read this far and no further. */
	maxDiscordEntries: 500,
} as const;

export const CHANGE_WINDOWS = [1, 3, 7, 14] as const;

export type ChangeWindow = (typeof CHANGE_WINDOWS)[number];

export const CHANGE_SOURCES = ["all", "dashboard", "discord"] as const;

export type ChangeSource = (typeof CHANGE_SOURCES)[number];

/** What a change was made to; `settings` is a dashboard change, which is always to the bot's own configuration. */
export const CHANGE_KINDS = [
	"settings",
	"server",
	"channel",
	"role",
	"member",
	"invite",
	"webhook",
	"emoji",
	"sticker",
	"message",
	"integration",
	"event",
	"thread",
	"automod",
	"other",
] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const CHANGE_VERBS = [
	"created",
	"updated",
	"deleted",
	"kicked",
	"banned",
	"unbanned",
	"timedOut",
	"rolesChanged",
	"moved",
	"disconnected",
	"pruned",
	"pinned",
	"unpinned",
	"botAdded",
	"other",
] as const;

export type ChangeVerb = (typeof CHANGE_VERBS)[number];

export interface ServerChange {
	id: string;
	source: Exclude<ChangeSource, "all">;
	at: string;
	actorId: string | null;
	actorTag: string;
	kind: ChangeKind;
	verb: ChangeVerb;
	/** A dashboard change's own sentence; a Discord one is worded by each surface from `kind` and `verb`. */
	summary: string | null;
	/** The channel, role, member or other thing changed, by name, when Discord still knows it. */
	target: string | null;
	reason: string | null;
}

export interface ServerChangesPage extends Paged<ServerChange> {
	/** False when the bot cannot read the audit log, so only dashboard changes can be shown. */
	discordReadable: boolean;
	/** True when the server changed more in the window than `maxDiscordEntries`, so the oldest are not listed. */
	truncated: boolean;
}

export const changesQuery = z.object({
	page: z.coerce.number().int().min(1).max(10_000).default(1),
	days: z.coerce
		.number()
		.int()
		.refine((days) => CHANGE_WINDOWS.some((window) => window === days), "must be 1, 3, 7 or 14")
		.default(7),
	source: z.enum(CHANGE_SOURCES).default("all"),
	/** A name, a Discord ID or any words from the change itself. */
	q: plainLine(1, 64).optional(),
});

export type ChangesQuery = z.infer<typeof changesQuery>;

/** Case-insensitive, over everything a person reading the row could have seen, and an ID matches the actor exactly. */
export function changeMatches(change: ServerChange, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (needle === "") return true;
	if (/^\d{17,20}$/.test(needle)) return change.actorId === needle;

	return [change.actorTag, change.summary, change.target, change.reason, change.kind, change.verb].some(
		(field) => field?.toLowerCase().includes(needle) ?? false,
	);
}
