import { AUDIT_EVENT_LABELS } from "@lib/moderation/auditLabels.util";
import {
	AUDIT_EVENT_GROUP,
	AUDIT_EVENTS,
	AUDIT_GROUPS,
	type AuditLogConfigResponse,
	auditEventsIn,
	auditLogChanged,
	auditLogPutSchema,
	collapseEnabled,
	resolveEnabled,
} from "@testify/shared";

const saved: AuditLogConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	events: ["banAdd", "roleCreate"],
	all: false,
};

describe("the event list", () => {
	/** A missing label renders as an empty option in the panel's select, so the map has to cover the list exactly. */
	it("labels every event", () => {
		for (const event of AUDIT_EVENTS) {
			expect(AUDIT_EVENT_LABELS[event].label).not.toBe("");
			expect(AUDIT_GROUPS).toContain(AUDIT_EVENT_GROUP[event]);
		}
	});

	/** An event in no group would be unreachable on the dashboard, which renders group by group. */
	it("puts every event in exactly one group", () => {
		const grouped = AUDIT_GROUPS.flatMap((group) => auditEventsIn(group));

		expect(grouped.toSorted()).toEqual([...AUDIT_EVENTS].toSorted());
	});
});

describe("the all shorthand", () => {
	/** Storing every name would freeze a guild at today's list rather than opting it into later ones. */
	it("collapses a full selection back to all, and survives a round trip", () => {
		expect(collapseEnabled([...AUDIT_EVENTS])).toEqual(["all"]);
		expect(resolveEnabled(collapseEnabled([...AUDIT_EVENTS]))).toEqual([...AUDIT_EVENTS]);
	});
});

describe("auditLogChanged", () => {
	/** The two lists come from different places, so a reorder must not read as an edit. */
	it("ignores the order the events are in", () => {
		expect(
			auditLogChanged(saved, { enabled: true, channelId: saved.channelId, events: ["roleCreate", "banAdd"] }),
		).toBe(false);
	});

	/** Same length, different members — a comparison that only counted would miss this. */
	it("notices a swap that keeps the count", () => {
		expect(auditLogChanged(saved, { ...saved, events: ["banAdd", "roleDelete"] })).toBe(true);
	});
});

describe("auditLogPutSchema", () => {
	it("rejects an event the bot cannot log", () => {
		expect(auditLogPutSchema.safeParse({ enabled: true, channelId: null, events: ["dropDatabase"] }).success).toBe(
			false,
		);
	});

	it("rejects a channel that is not a snowflake", () => {
		expect(auditLogPutSchema.safeParse({ enabled: true, channelId: "nope", events: [] }).success).toBe(false);
	});
});
