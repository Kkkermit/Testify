import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { AUDIT_EVENTS } from "@lib/moderation/auditLog.util";
import {
	auditPanel,
	auditSavedPanel,
	collapseEnabled,
	decodeDraft,
	decodeEvents,
	encodeEvents,
	hasUnsavedChanges,
	isAuditEvent,
	resolveEnabled,
} from "@lib/moderation/auditPanel.util";
import { AUDIT_PANEL_ID } from "@lib/moderation/moderation.constants";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const CHANNEL = "200000000000000002";

/** Every select menu in the container, whatever its type. */
function selectsOf(rendered: ReturnType<typeof auditPanel>): Record<string, unknown>[] {
	const found: Record<string, unknown>[] = [];

	const walk = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;

		if (typeof record.type === "number" && record.type >= 3 && record.type <= 8) found.push(record);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(walk);
			else if (typeof value === "object") walk(value);
		}
	};

	rendered.components.forEach((component) => walk(component.toJSON()));
	return found;
}

describe("resolveEnabled", () => {
	/** `all` is stored as shorthand, so the menu has to expand it to tick each box. */
	it("expands the all shorthand to every event", () => {
		expect(resolveEnabled(["all"])).toEqual([...AUDIT_EVENTS]);
	});

	it("drops names that are not real events, so a stale config cannot crash the menu", () => {
		expect(resolveEnabled(["banAdd", "nonsense"])).toEqual(["banAdd"]);
	});
});

describe("collapseEnabled", () => {
	/** A full selection is stored as `all`, so events added later are logged too. */
	it("collapses a full selection back to the all shorthand", () => {
		expect(collapseEnabled([...AUDIT_EVENTS])).toEqual(["all"]);
	});
});

describe("isAuditEvent", () => {
	it("accepts a real event and rejects anything else", () => {
		expect(isAuditEvent("banAdd")).toBe(true);
		expect(isAuditEvent("all")).toBe(false);
		expect(isAuditEvent("somethingElse")).toBe(false);
	});
});

describe("the draft codec", () => {
	/** A selection round-trips through the bit-packed custom ID. */
	it("round-trips a selection", () => {
		expect(decodeEvents(encodeEvents(["banAdd", "voiceUpdate"]))).toEqual(["banAdd", "voiceUpdate"]);
	});

	it("stays inside a custom ID", () => {
		expect(encodeEvents([...AUDIT_EVENTS]).length).toBeLessThanOrEqual(8);
	});

	/** A stale or hand-edited custom ID must not crash the panel. */
	it("treats a token that is not a number as nothing selected", () => {
		expect(decodeEvents("")).toEqual([]);
		expect(decodeEvents("!!")).toEqual([]);
	});

	it("reads a channel and a selection back out of custom ID arguments", () => {
		const args = [CHANNEL, encodeEvents(["banAdd"]), OWNER];
		expect(decodeDraft(args)).toEqual({ channelId: CHANNEL, events: ["banAdd"] });
	});
});

describe("hasUnsavedChanges", () => {
	/** A stored `all` equals every box ticked, so the panel does not offer to save nothing. */
	it("treats a stored all as equal to every box being ticked", () => {
		expect(
			hasUnsavedChanges({ channelId: CHANNEL, enabled: ["all"] }, { channelId: CHANNEL, events: [...AUDIT_EVENTS] }),
		).toBe(false);
	});

	/** Same count, different members — a length check alone would miss this. */
	it("sees a swap that keeps the count the same", () => {
		expect(
			hasUnsavedChanges({ channelId: CHANNEL, enabled: ["banAdd"] }, { channelId: CHANNEL, events: ["roleCreate"] }),
		).toBe(true);
	});
});

describe("the audit panel", () => {
	const configured = auditPanel({ channelId: CHANNEL, enabled: ["banAdd", "roleCreate"] }, OWNER);

	it("is a Components V2 message", () => {
		expect(configured.flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** Zero is a real choice — keep the channel, log nothing for now. */
	it("lets the selection be emptied", () => {
		const events = selectsOf(configured).find((menu) => menu.type === 3);
		expect(events?.min_values).toBe(0);
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it("gives every control a distinct custom ID", () => {
		expect(duplicateIds(configured)).toEqual([]);
		expect(duplicateIds(auditPanel({ channelId: null, enabled: [] }, OWNER))).toEqual([]);
		expect(duplicateIds(auditPanel({ channelId: CHANNEL, enabled: ["all"], dirty: true }, OWNER))).toEqual([]);
		expect(duplicateIds(auditSavedPanel({ channelId: CHANNEL, enabled: ["all"] }, OWNER))).toEqual([]);
	});

	it("puts the owner last, so ownerOnly can read it", () => {
		for (const id of idsOf(configured)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	describe("before a channel is chosen", () => {
		const fresh = auditPanel({ channelId: null, enabled: [] }, OWNER);

		/** Choosing events without somewhere to send them is a dead end. */
		it("disables the event picker and every button", () => {
			expect(selectsOf(fresh).find((menu) => menu.type === 3)?.disabled).toBe(true);
			for (const control of buttonsOf(fresh)) expect(control.disabled).toBe(true);
		});
	});

	/** The status line is for admins, not for whoever named the gateway events. */
	it("describes events in plain English rather than as gateway names", () => {
		const text = textOf(configured);

		expect(text).toContain("Member banned");
		expect(text).not.toContain("banAdd");
	});

	describe("saving", () => {
		const dirty = auditPanel({ channelId: CHANNEL, enabled: ["banAdd"], dirty: true }, OWNER);
		const saveOf = (rendered: ReturnType<typeof auditPanel>): Record<string, unknown> | undefined =>
			buttonsOf(rendered).find((control) => control.label === "Save");

		/** Pressing Save when the draft already matches the database writes nothing. */
		it("greys out Save when there is nothing to save", () => {
			expect(saveOf(configured)?.disabled).toBe(true);
		});

		/** The panel says a draft is not applied until Save. */
		it("says the changes are not applied yet", () => {
			expect(textOf(dirty)).toMatch(/saved yet/i);
			expect(textOf(dirty)).not.toMatch(/^Logging/m);
		});
	});
});

describe("the saved panel", () => {
	const saved = auditSavedPanel({ channelId: CHANNEL, enabled: ["banAdd", "roleCreate"] }, OWNER);

	it("is a Components V2 message", () => {
		expect(saved.flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** Saving an empty selection is legal but does nothing, so it must not claim success. */
	it("does not claim to be active when nothing is selected", () => {
		const silent = textOf(auditSavedPanel({ channelId: CHANNEL, enabled: [] }, OWNER));

		expect(silent).not.toMatch(/is active/i);
		expect(silent).toMatch(/nothing will be logged/i);
	});

	/** No half-made edits on this screen, so there is nothing to pick from either. */
	it("has no menus", () => {
		expect(selectsOf(saved)).toHaveLength(0);
	});

	it("namespaces every control to the audit handler, with the owner last", () => {
		for (const id of idsOf(saved)) {
			expect(parseCustomId(id).id).toBe(AUDIT_PANEL_ID);
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});
});

describe("the dashboard pointer", () => {
	/** A link to nothing is worse than no link, so it only appears when the dashboard is switched on. */
	it("is absent when there is no hint", () => {
		const message = auditPanel({ channelId: "400000000000000001", enabled: ["all"] }, OWNER);

		expect(textOf(message)).not.toContain("in a browser");
	});
});
