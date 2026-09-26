import { parseCustomId } from "@core/button";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { warnLadderPanel } from "@lib/moderation/warnLadderPanel.util";
import { WARN_LIMITS, type WarnStep } from "@testify/shared";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const EXAMPLE: WarnStep[] = [
	{ action: "warn" },
	{ action: "timeout", minutes: 10 },
	{ action: "kick" },
	{ action: "ban" },
];

/** Every component Discord counts towards its limit: anything carrying a numeric `type`, the container included. */
function componentCount(rendered: ContainerMessage): number {
	let count = 0;
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;
		if (typeof record.type === "number") count += 1;
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};
	rendered.components.forEach((component) => descend(component.toJSON()));
	return count;
}

function selectsOf(
	rendered: ContainerMessage,
): { custom_id: string; options: { label: string; value: string; default?: boolean }[] }[] {
	const found: { custom_id: string; options: { label: string; value: string; default?: boolean }[] }[] = [];
	const descend = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;
		if (Array.isArray(record.options) && typeof record.custom_id === "string") found.push(record as never);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(descend);
			else if (typeof value === "object") descend(value);
		}
	};
	rendered.components.forEach((component) => descend(component.toJSON()));
	return found;
}

describe("warnLadderPanel", () => {
	it("says a warning is only a warning when no steps are set", () => {
		const rendered = warnLadderPanel({ steps: [] }, OWNER);

		expect(textOf(rendered)).toMatch(/only a warning/);
		expect(selectsOf(rendered)).toHaveLength(0);
	});

	it("draws one menu per warning, each showing what it does now", () => {
		const menus = selectsOf(warnLadderPanel({ steps: EXAMPLE }, OWNER));

		expect(menus).toHaveLength(4);
		expect(menus.map((menu) => menu.options.find((choice) => choice.default === true)?.label)).toEqual([
			"Warning 1 · Warning only",
			"Warning 2 · Time out for 10 minutes",
			"Warning 3 · Kick",
			"Warning 4 · Ban",
		]);
	});

	/** Discord rejects a whole message past 40 components, so a full ladder has to fit with room to spare. */
	it("fits Discord's component limit at the most steps a server can set", () => {
		const full = Array.from({ length: WARN_LIMITS.maxSteps }, (): WarnStep => ({ action: "kick" }));

		expect(componentCount(warnLadderPanel({ steps: full }, OWNER, "A note."))).toBeLessThanOrEqual(40);
	});

	/** The router compares the last argument with whoever pressed, so every control must end with the owner. */
	it("ends every custom ID with the person who opened it, and repeats none", () => {
		const rendered = warnLadderPanel({ steps: EXAMPLE }, OWNER);

		for (const id of idsOf(rendered)) expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		expect(duplicateIds(rendered)).toEqual([]);
	});

	it("stops adding at the limit and stops removing at none", () => {
		const full = Array.from({ length: WARN_LIMITS.maxSteps }, (): WarnStep => ({ action: "warn" }));
		const [addFull] = buttonsOf(warnLadderPanel({ steps: full }, OWNER));
		const [, popEmpty] = buttonsOf(warnLadderPanel({ steps: [] }, OWNER));

		expect(addFull?.disabled).toBe(true);
		expect(popEmpty?.disabled).toBe(true);
	});

	it("shows the note from the last change", () => {
		expect(textOf(warnLadderPanel({ steps: EXAMPLE }, OWNER, "Removed warning 5."))).toContain("Removed warning 5.");
	});
});
