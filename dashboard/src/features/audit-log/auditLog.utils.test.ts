import { AUDIT_EVENTS } from "@testify/shared";
import { draftFrom, groupState, saveBlocked, setGroup, toggleEvent } from "@/features/audit-log/auditLog.utils";
import { auditLogConfig } from "@/test/handlers";

describe("toggleEvent", () => {
	it("adds one that is not chosen and removes one that is", () => {
		expect(toggleEvent(["banAdd"], "roleCreate")).toContain("roleCreate");
		expect(toggleEvent(["banAdd", "roleCreate"], "banAdd")).toEqual(["roleCreate"]);
	});

	/** The saved list and the rendered list come from the same array, so ticking cannot reshuffle either. */
	it("keeps the selection in the canonical event order", () => {
		expect(toggleEvent(["voiceUpdate"], "messageDelete")).toEqual(["messageDelete", "voiceUpdate"]);
	});
});

describe("setGroup", () => {
	it("ticks every event in the group without touching the others", () => {
		const next = setGroup(["banAdd"], "Roles", true);

		expect(next).toContain("roleCreate");
		expect(next).toContain("roleUpdate");
		expect(next).toContain("banAdd");
	});

	it("clears only that group", () => {
		const next = setGroup(["banAdd", "roleCreate", "roleDelete"], "Roles", false);

		expect(next).toEqual(["banAdd"]);
	});

	/** Ticking a group twice must not double its events, which a plain concat would do. */
	it("does not duplicate events that were already chosen", () => {
		const once = setGroup([], "Roles", true);

		expect(setGroup(once, "Roles", true)).toEqual(once);
	});
});

describe("groupState", () => {
	it("reports none, some and all", () => {
		expect(groupState([], "Roles")).toBe("none");
		expect(groupState(["roleCreate"], "Roles")).toBe("some");
		expect(groupState(setGroup([], "Roles", true), "Roles")).toBe("all");
	});
});

describe("saveBlocked", () => {
	it("allows an ordinary configuration", () => {
		expect(saveBlocked({ enabled: true, channelId: "400000000000000001", events: ["banAdd"] })).toBeNull();
	});

	/** Turning it off deletes the record, so neither a channel nor an event is needed to do it. */
	it("allows turning it off with nothing chosen", () => {
		expect(saveBlocked({ enabled: false, channelId: null, events: [] })).toBeNull();
	});

	it("refuses a log with nowhere to post", () => {
		expect(saveBlocked({ enabled: true, channelId: null, events: ["banAdd"] })).toMatch(/channel/i);
	});

	it("refuses a log that would record nothing", () => {
		expect(saveBlocked({ enabled: true, channelId: "400000000000000001", events: [] })).toMatch(/at least one/i);
	});
});

describe("draftFrom", () => {
	it("starts from what is saved", () => {
		expect(draftFrom(auditLogConfig)).toEqual({
			enabled: true,
			channelId: auditLogConfig.channelId,
			events: auditLogConfig.events,
		});
	});

	/** An unconfigured guild arrives with every event pre-ticked, so the first save is one click. */
	it("keeps the pre-ticked selection an unconfigured guild arrives with", () => {
		const draft = draftFrom({ enabled: false, channelId: null, events: [...AUDIT_EVENTS], all: true });

		expect(draft.events).toHaveLength(AUDIT_EVENTS.length);
	});
});
