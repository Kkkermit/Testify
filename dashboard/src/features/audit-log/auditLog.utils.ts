import {
	AUDIT_EVENTS,
	type AuditEvent,
	type AuditGroup,
	type AuditLogConfigResponse,
	type AuditLogPut,
	auditEventsIn,
} from "@testify/shared";

/** How much of one group is ticked, which is what the group's own checkbox has to show. */
export type GroupState = "none" | "some" | "all";

export function draftFrom(config: AuditLogConfigResponse): AuditLogPut {
	return { enabled: config.enabled, channelId: config.channelId, events: config.events };
}

/** Selections are kept in `AUDIT_EVENTS` order, so the saved list and the rendered list never disagree. */
function ordered(events: Iterable<AuditEvent>): AuditEvent[] {
	const chosen = new Set(events);
	return AUDIT_EVENTS.filter((event) => chosen.has(event));
}

export function toggleEvent(events: AuditEvent[], event: AuditEvent): AuditEvent[] {
	return events.includes(event) ? events.filter((each) => each !== event) : ordered([...events, event]);
}

export function setGroup(events: AuditEvent[], group: AuditGroup, on: boolean): AuditEvent[] {
	const inGroup = auditEventsIn(group);

	return on ? ordered([...events, ...inGroup]) : events.filter((event) => !inGroup.includes(event));
}

export function groupState(events: AuditEvent[], group: AuditGroup): GroupState {
	const inGroup = auditEventsIn(group);
	const chosen = inGroup.filter((event) => events.includes(event)).length;

	if (chosen === 0) return "none";
	return chosen === inGroup.length ? "all" : "some";
}

/** Why Save is unavailable, in the words shown beside it, so nobody discovers it after pressing the button. */
export function saveBlocked(draft: AuditLogPut): string | null {
	if (!draft.enabled) return null;
	if (draft.channelId === null) return "Choose a channel for the log before turning it on.";
	if (draft.events.length === 0) return "Pick at least one event, or turn audit logging off.";

	return null;
}
