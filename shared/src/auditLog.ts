import { z } from "zod";
import { snowflake } from "./schemas";

/**
 * What audit logging can watch, and the one interpretation of how it is stored. Shared because the Discord
 * panel, the API and the browser form all have to agree on the `all` shorthand — a surface that expanded it
 * differently would quietly change which events a guild logs.
 */

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

export interface AuditEventLook {
	label: string;
	describes: string;
	group: AuditGroup;
}

/** Human labels, so neither surface reads like a list of gateway constants. */
export const AUDIT_EVENT_LABELS: Record<AuditEvent, AuditEventLook> = {
	messageDelete: { label: "Message deleted", describes: "Someone's message was removed", group: "Messages" },
	messageUpdate: { label: "Message edited", describes: "A message was changed", group: "Messages" },
	channelCreate: { label: "Channel created", describes: "A new channel appeared", group: "Channels" },
	channelDelete: { label: "Channel deleted", describes: "A channel was removed", group: "Channels" },
	channelUpdate: { label: "Channel updated", describes: "A channel was renamed or reconfigured", group: "Channels" },
	roleCreate: { label: "Role created", describes: "A new role was added", group: "Roles" },
	roleDelete: { label: "Role deleted", describes: "A role was removed", group: "Roles" },
	roleUpdate: { label: "Role updated", describes: "A role's name, colour or permissions changed", group: "Roles" },
	memberJoin: { label: "Member joined", describes: "Someone joined the server", group: "Members" },
	memberLeave: { label: "Member left", describes: "Someone left or was removed", group: "Members" },
	memberUpdate: { label: "Member updated", describes: "Nickname or roles changed", group: "Members" },
	banAdd: { label: "Member banned", describes: "Someone was banned", group: "Members" },
	banRemove: { label: "Member unbanned", describes: "A ban was lifted", group: "Members" },
	emojiUpdate: { label: "Emoji changed", describes: "Server emoji were added or removed", group: "Server" },
	guildUpdate: { label: "Server updated", describes: "Server settings changed", group: "Server" },
	inviteUpdate: { label: "Invites changed", describes: "An invite was created or deleted", group: "Server" },
	threadUpdate: { label: "Threads changed", describes: "A thread was created, archived or deleted", group: "Channels" },
	voiceUpdate: { label: "Voice activity", describes: "Members joining or leaving voice channels", group: "Members" },
};

export function isAuditEvent(value: string): value is AuditEvent {
	return (AUDIT_EVENTS as readonly string[]).includes(value);
}

export function auditEventsIn(group: AuditGroup): AuditEvent[] {
	return AUDIT_EVENTS.filter((event) => AUDIT_EVENT_LABELS[event].group === group);
}

/** Expands the stored `all` shorthand so a menu or a checklist can tick each option. */
export function resolveEnabled(enabled: string[]): AuditEvent[] {
	if (enabled.includes("all")) return [...AUDIT_EVENTS];

	return enabled.filter(isAuditEvent);
}

/**
 * Collapses a full selection back to `all`, so a guild that ticks everything keeps logging events added in a
 * later release rather than being frozen at today's list.
 */
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

/**
 * The whole configuration in one request, because the panel it mirrors saves once: a channel and a set of
 * events are one decision, and half of it applied is not a state anyone wants.
 */
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
