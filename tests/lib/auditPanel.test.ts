import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { AUDIT_EVENTS } from "@lib/auditLog.util";
import {
	AUDIT_PANEL_ID,
	auditPanel,
	auditSavedPanel,
	collapseEnabled,
	decodeDraft,
	decodeEvents,
	encodeEvents,
	hasUnsavedChanges,
	isAuditEvent,
	resolveEnabled,
} from "@lib/auditPanel.util";
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

	it("keeps an explicit list as it is", () => {
		expect(resolveEnabled(["banAdd", "roleCreate"])).toEqual(["banAdd", "roleCreate"]);
	});

	it("drops names that are not real events, so a stale config cannot crash the menu", () => {
		expect(resolveEnabled(["banAdd", "nonsense"])).toEqual(["banAdd"]);
	});

	it("treats an empty list as nothing enabled", () => {
		expect(resolveEnabled([])).toEqual([]);
	});
});

describe("collapseEnabled", () => {
	/**
	 * Storing `all` rather than today's eighteen names means a guild that ticked
	 * everything keeps logging events added in a later release.
	 */
	it("collapses a full selection back to the all shorthand", () => {
		expect(collapseEnabled([...AUDIT_EVENTS])).toEqual(["all"]);
	});

	it("leaves a partial selection expanded", () => {
		expect(collapseEnabled(["banAdd"])).toEqual(["banAdd"]);
	});

	it("round-trips through resolve", () => {
		expect(resolveEnabled(collapseEnabled([...AUDIT_EVENTS]))).toEqual([...AUDIT_EVENTS]);
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
	/**
	 * The whole reason a Save button is possible: eighteen names would blow Discord's
	 * 100-character custom ID, eighteen bits in base 36 do not.
	 */
	it("round-trips a selection", () => {
		expect(decodeEvents(encodeEvents(["banAdd", "voiceUpdate"]))).toEqual(["banAdd", "voiceUpdate"]);
	});

	it("round-trips every event", () => {
		expect(decodeEvents(encodeEvents([...AUDIT_EVENTS]))).toEqual([...AUDIT_EVENTS]);
	});

	it("round-trips an empty selection", () => {
		expect(decodeEvents(encodeEvents([]))).toEqual([]);
	});

	it("stays inside a custom ID", () => {
		expect(encodeEvents([...AUDIT_EVENTS]).length).toBeLessThanOrEqual(8);
	});

	it("returns events in AUDIT_EVENTS order however they were given", () => {
		expect(decodeEvents(encodeEvents(["voiceUpdate", "banAdd"]))).toEqual(["banAdd", "voiceUpdate"]);
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

	it("reads the no-channel placeholder back as null", () => {
		expect(decodeDraft(["-", "0", OWNER])).toEqual({ channelId: null, events: [] });
	});

	it("copes with arguments that are missing entirely", () => {
		expect(decodeDraft([])).toEqual({ channelId: null, events: [] });
	});
});

describe("hasUnsavedChanges", () => {
	it("sees no change when the draft matches what is stored", () => {
		expect(
			hasUnsavedChanges({ channelId: CHANNEL, enabled: ["banAdd"] }, { channelId: CHANNEL, events: ["banAdd"] }),
		).toBe(false);
	});

	/**
	 * The stored `all` shorthand expands to the same set as a fully ticked menu, so
	 * opening the panel on a fully configured guild must not offer to save nothing.
	 */
	it("treats a stored all as equal to every box being ticked", () => {
		expect(
			hasUnsavedChanges({ channelId: CHANNEL, enabled: ["all"] }, { channelId: CHANNEL, events: [...AUDIT_EVENTS] }),
		).toBe(false);
	});

	it("sees a changed channel", () => {
		expect(
			hasUnsavedChanges({ channelId: CHANNEL, enabled: ["banAdd"] }, { channelId: "999", events: ["banAdd"] }),
		).toBe(true);
	});

	it("sees an added event", () => {
		expect(
			hasUnsavedChanges(
				{ channelId: CHANNEL, enabled: ["banAdd"] },
				{ channelId: CHANNEL, events: ["banAdd", "roleCreate"] },
			),
		).toBe(true);
	});

	it("sees a removed event", () => {
		expect(
			hasUnsavedChanges(
				{ channelId: CHANNEL, enabled: ["banAdd", "roleCreate"] },
				{ channelId: CHANNEL, events: ["banAdd"] },
			),
		).toBe(true);
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

	it("offers a channel picker and an event picker", () => {
		expect(selectsOf(configured)).toHaveLength(2);
	});

	it("ticks exactly the events that are enabled", () => {
		const events = selectsOf(configured).find((menu) => menu.type === 3);
		const options = events?.options as { value: string; default?: boolean }[];
		const ticked = options.filter((entry) => entry.default === true).map((entry) => entry.value);

		expect(ticked.sort()).toEqual(["banAdd", "roleCreate"]);
	});

	it("offers every event as a choice", () => {
		const events = selectsOf(configured).find((menu) => menu.type === 3);
		expect((events?.options as unknown[]).length).toBe(AUDIT_EVENTS.length);
	});

	/** Zero is a real choice — keep the channel, log nothing for now. */
	it("lets the selection be emptied", () => {
		const events = selectsOf(configured).find((menu) => menu.type === 3);
		expect(events?.min_values).toBe(0);
	});

	it("names the channel it is logging to", () => {
		expect(textOf(configured)).toContain(CHANNEL);
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it("gives every control a distinct custom ID", () => {
		expect(duplicateIds(configured)).toEqual([]);
		expect(duplicateIds(auditPanel({ channelId: null, enabled: [] }, OWNER))).toEqual([]);
		expect(duplicateIds(auditPanel({ channelId: CHANNEL, enabled: ["all"], dirty: true }, OWNER))).toEqual([]);
		expect(duplicateIds(auditSavedPanel({ channelId: CHANNEL, enabled: ["all"] }, OWNER))).toEqual([]);
	});

	it("namespaces every control to the audit handler", () => {
		for (const id of idsOf(configured)) expect(parseCustomId(id).id).toBe(AUDIT_PANEL_ID);
	});

	it("puts the owner last, so ownerOnly can read it", () => {
		for (const id of idsOf(configured)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
	});

	describe("before a channel is chosen", () => {
		const fresh = auditPanel({ channelId: null, enabled: [] }, OWNER);

		it("asks for a channel rather than showing a status", () => {
			expect(textOf(fresh)).toMatch(/pick a channel/i);
		});

		/** Choosing events without somewhere to send them is a dead end. */
		it("disables the event picker and every button", () => {
			expect(selectsOf(fresh).find((menu) => menu.type === 3)?.disabled).toBe(true);
			for (const control of buttonsOf(fresh)) expect(control.disabled).toBe(true);
		});
	});

	it("warns when a channel is set but nothing is selected", () => {
		expect(textOf(auditPanel({ channelId: CHANNEL, enabled: [] }, OWNER))).toMatch(/nothing will be logged/i);
	});

	it("says so plainly when everything is on", () => {
		expect(textOf(auditPanel({ channelId: CHANNEL, enabled: ["all"] }, OWNER))).toContain("every event");
	});

	it("greys out Log everything once it already is", () => {
		const all = auditPanel({ channelId: CHANNEL, enabled: ["all"] }, OWNER);
		const logEverything = buttonsOf(all).find((control) => control.label === "Log everything");

		expect(logEverything?.disabled).toBe(true);
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

		it("offers a Save button", () => {
			expect(saveOf(configured)).toBeDefined();
		});

		/** Pressing Save when the draft already matches the database writes nothing. */
		it("greys out Save when there is nothing to save", () => {
			expect(saveOf(configured)?.disabled).toBe(true);
		});

		it("enables Save once something has been changed", () => {
			expect(saveOf(dirty)?.disabled).toBe(false);
		});

		/**
		 * Editing is a draft, so the panel must never read as though a selection is
		 * already live — an admin who closes it without saving has changed nothing.
		 */
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

	it("says logging is active and where it goes", () => {
		expect(textOf(saved)).toMatch(/is active/i);
		expect(textOf(saved)).toContain(CHANNEL);
	});

	it("lists what was enabled, in plain English", () => {
		expect(textOf(saved)).toContain("Member banned");
		expect(textOf(saved)).toContain("Role created");
	});

	it("says so plainly when everything is on", () => {
		expect(textOf(auditSavedPanel({ channelId: CHANNEL, enabled: ["all"] }, OWNER))).toContain("every event");
	});

	/** Saving an empty selection is legal but does nothing, so it must not claim success. */
	it("does not claim to be active when nothing is selected", () => {
		const silent = textOf(auditSavedPanel({ channelId: CHANNEL, enabled: [] }, OWNER));

		expect(silent).not.toMatch(/is active/i);
		expect(silent).toMatch(/nothing will be logged/i);
	});

	it("offers only a way back and a way out", () => {
		expect(buttonsOf(saved).map((control) => control.label)).toEqual(["Edit", "Turn off"]);
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
