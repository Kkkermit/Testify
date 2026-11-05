import {
	AUDIT_EVENTS,
	type AuditEvent,
	type AuditGroup,
	type AuditLogConfigResponse,
	type AuditLogPut,
	auditEventsIn,
} from "@testify/shared";
import { type TFunction } from "i18next";

export type GroupState = "none" | "some" | "all";

export function draftFrom(config: AuditLogConfigResponse): AuditLogPut {
	return { enabled: config.enabled, channelId: config.channelId, events: config.events };
}

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

export function saveBlocked(draft: AuditLogPut, t: TFunction): string | null {
	if (!draft.enabled) return null;
	if (draft.channelId === null) return t("auditLog.pickChannel");
	if (draft.events.length === 0) return t("auditLog.pickEvent");

	return null;
}

export function auditSummary(
	saved: Pick<AuditLogPut, "enabled" | "channelId" | "events">,
	channel: string,
	t: TFunction,
): string {
	if (!saved.enabled || saved.channelId === null || saved.events.length === 0) return t("auditLog.summaryOff");
	return saved.events.length === AUDIT_EVENTS.length
		? t("auditLog.summaryAll", { channel })
		: t("auditLog.summarySome", { count: saved.events.length, channel });
}
