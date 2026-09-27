import { z } from "zod";
import { snowflake } from "./schemas";

/** What audit logging can watch, and how the `all` shorthand is stored, shared by every surface. */

export const AUDIT_EVENTS = [
	"messageDelete",
	"messageUpdate",
	"channelCreate",
	"channelDelete",
	"channelUpdate",
	"roleCreate",
	"roleDelete",
	"roleUpdate",
	"memberJoin",
	"memberLeave",
	"memberUpdate",
	"banAdd",
	"banRemove",
	"emojiUpdate",
	"guildUpdate",
	"inviteUpdate",
	"threadUpdate",
	"voiceUpdate",
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

/** Which part of a server an event is about, so eighteen checkboxes read as four short lists. */
export const AUDIT_GROUPS = ["Messages", "Channels", "Roles", "Members", "Server"] as const;

export type AuditGroup = (typeof AUDIT_GROUPS)[number];

/** Which part of a server each event is about; the wording for it belongs to whichever surface shows it. */
export const AUDIT_EVENT_GROUP: Record<AuditEvent, AuditGroup> = {
	messageDelete: "Messages",
	messageUpdate: "Messages",
	channelCreate: "Channels",
	channelDelete: "Channels",
	channelUpdate: "Channels",
	roleCreate: "Roles",
	roleDelete: "Roles",
	roleUpdate: "Roles",
	memberJoin: "Members",
	memberLeave: "Members",
	memberUpdate: "Members",
	banAdd: "Members",
	banRemove: "Members",
	emojiUpdate: "Server",
	guildUpdate: "Server",
	inviteUpdate: "Server",
	threadUpdate: "Channels",
	voiceUpdate: "Members",
};

export function isAuditEvent(value: string): value is AuditEvent {
	return (AUDIT_EVENTS as readonly string[]).includes(value);
}

export function auditEventsIn(group: AuditGroup): AuditEvent[] {
	return AUDIT_EVENTS.filter((event) => AUDIT_EVENT_GROUP[event] === group);
}

/** Expands the stored `all` shorthand so a menu or a checklist can tick each option. */
export function resolveEnabled(enabled: string[]): AuditEvent[] {
	if (enabled.includes("all")) return [...AUDIT_EVENTS];

	return enabled.filter(isAuditEvent);
}

/** Collapses a full selection to `all`, so events added later are logged too. */
export function collapseEnabled(events: AuditEvent[]): string[] {
	return events.length === AUDIT_EVENTS.length ? ["all"] : events;
}

export interface AuditLogConfigResponse {
	/** False when no record exists at all, which is how the bot stores "off". */
	enabled: boolean;
	channelId: string | null;
	events: AuditEvent[];
	/** True when the guild is on the `all` shorthand, and so opted in to events added later. */
	all: boolean;
}

/** The whole configuration in one request, because a channel and its events are one decision. */
export const auditLogPutSchema = z.object({
	enabled: z.boolean(),
	channelId: snowflake.nullable(),
	events: z.array(z.enum(AUDIT_EVENTS)).max(AUDIT_EVENTS.length),
});

export type AuditLogPut = z.infer<typeof auditLogPutSchema>;

/** Whether Save has anything to do. */
export function auditLogChanged(saved: AuditLogConfigResponse, draft: AuditLogPut): boolean {
	if (saved.enabled !== draft.enabled || saved.channelId !== draft.channelId) return true;

	return saved.events.length !== draft.events.length || draft.events.some((event) => !saved.events.includes(event));
}
