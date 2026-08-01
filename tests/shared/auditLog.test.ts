import {
	AUDIT_EVENT_LABELS,
	AUDIT_EVENTS,
	AUDIT_GROUPS,
	type AuditLogConfigResponse,
	auditEventsIn,
	auditLogChanged,
	auditLogPutSchema,
	collapseEnabled,
	isAuditEvent,
	resolveEnabled,
} from "@testify/shared";

const saved: AuditLogConfigResponse = {
	enabled: true,
	channelId: "400000000000000001",
	events: ["banAdd", "roleCreate"],
	all: false,
};

describe("the event list", () => {
	/** A missing label renders as an empty checkbox, so the map has to cover the list exactly. */
	it("labels every event", () => {
		for (const event of AUDIT_EVENTS) {
			expect(AUDIT_EVENT_LABELS[event].label).not.toBe("");
			expect(AUDIT_GROUPS).toContain(AUDIT_EVENT_LABELS[event].group);
		}
	});

	/** An event in no group would be unreachable on the dashboard, which renders group by group. */
	it("puts every event in exactly one group", () => {
		const grouped = AUDIT_GROUPS.flatMap((group) => auditEventsIn(group));

		expect(grouped.toSorted()).toEqual([...AUDIT_EVENTS].toSorted());
	});
});

describe("the all shorthand", () => {
	it("expands to every event", () => {
		expect(resolveEnabled(["all"])).toEqual([...AUDIT_EVENTS]);
	});

	it("ignores a name the bot no longer has", () => {
		expect(resolveEnabled(["banAdd", "nonsense"])).toEqual(["banAdd"]);
	});

	/** Storing every name would freeze a guild at today's list rather than opting it into later ones. */
	it("collapses a full selection back to all, and survives a round trip", () => {
		expect(collapseEnabled([...AUDIT_EVENTS])).toEqual(["all"]);
		expect(resolveEnabled(collapseEnabled([...AUDIT_EVENTS]))).toEqual([...AUDIT_EVENTS]);
	});

	it("leaves a partial selection as names", () => {
		expect(collapseEnabled(["banAdd"])).toEqual(["banAdd"]);
	});

	it("does not treat all as an event name", () => {
		expect(isAuditEvent("all")).toBe(false);
		expect(isAuditEvent("banAdd")).toBe(true);
	});
});

describe("auditLogChanged", () => {
	it("sees nothing to save when the draft matches", () => {
		expect(
			auditLogChanged(saved, { enabled: true, channelId: saved.channelId, events: ["banAdd", "roleCreate"] }),
		).toBe(false);
	});

	/** The two lists come from different places, so a reorder must not read as an edit. */
	it("ignores the order the events are in", () => {
		expect(
			auditLogChanged(saved, { enabled: true, channelId: saved.channelId, events: ["roleCreate", "banAdd"] }),
		).toBe(false);
	});

	it("notices a changed channel, a changed switch and a changed selection", () => {
		expect(auditLogChanged(saved, { ...saved, channelId: "400000000000000002" })).toBe(true);
		expect(auditLogChanged(saved, { ...saved, enabled: false })).toBe(true);
		expect(auditLogChanged(saved, { ...saved, events: ["banAdd"] })).toBe(true);
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

	it("accepts an empty selection, which is how a guild pauses without losing the channel", () => {
		expect(auditLogPutSchema.safeParse({ enabled: true, channelId: "400000000000000001", events: [] }).success).toBe(
			true,
		);
	});
});
