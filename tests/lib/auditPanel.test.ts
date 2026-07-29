import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { AUDIT_EVENTS } from "@lib/auditLog.util";
import { AUDIT_PANEL_ID, auditPanel, collapseEnabled, isAuditEvent, resolveEnabled } from "@lib/auditPanel.util";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

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
});
