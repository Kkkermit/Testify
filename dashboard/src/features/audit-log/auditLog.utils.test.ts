import { AUDIT_EVENTS } from "@testify/shared";
import { draftFrom, saveBlocked, setGroup, toggleEvent } from "@/features/audit-log/auditLog.utils";
import { t } from "@/test/english";

describe("toggleEvent", () => {
	/** The saved list and the rendered list come from the same array, so ticking cannot reshuffle either. */
	it("keeps the selection in the canonical event order", () => {
		expect(toggleEvent(["voiceUpdate"], "messageDelete")).toEqual(["messageDelete", "voiceUpdate"]);
	});
});

describe("setGroup", () => {
	/** Ticking a group twice must not double its events, which a plain concat would do. */
	it("does not duplicate events that were already chosen", () => {
		const once = setGroup([], "Roles", true);

		expect(setGroup(once, "Roles", true)).toEqual(once);
	});
});

describe("saveBlocked", () => {
	/** Turning it off deletes the record, so neither a channel nor an event is needed to do it. */
	it("allows turning it off with nothing chosen", () => {
		expect(saveBlocked({ enabled: false, channelId: null, events: [] }, t)).toBeNull();
	});

	it("refuses a log with nowhere to post", () => {
		expect(saveBlocked({ enabled: true, channelId: null, events: ["banAdd"] }, t)).toMatch(/channel/i);
	});

	it("refuses a log that would record nothing", () => {
		expect(saveBlocked({ enabled: true, channelId: "400000000000000001", events: [] }, t)).toMatch(/at least one/i);
	});
});

describe("draftFrom", () => {
	/** An unconfigured guild arrives with every event pre-ticked, so the first save is one click. */
	it("keeps the pre-ticked selection an unconfigured guild arrives with", () => {
		const draft = draftFrom({ enabled: false, channelId: null, events: [...AUDIT_EVENTS], all: true });

		expect(draft.events).toHaveLength(AUDIT_EVENTS.length);
	});
});
