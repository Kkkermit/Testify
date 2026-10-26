import { ComponentType } from "discord.js";
import { parseCustomId } from "@core/button";
import { autoResponderEditor, autoResponderHub } from "@lib/autoResponders/autoResponderPanel.util";
import { AUTO_RESPONDER_LIMITS, type AutoResponder } from "@testify/shared";
import { buttonsOf, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";

const responder = (index: number): AutoResponder => ({
	id: index.toString(16).padStart(24, "0"),
	trigger: `trigger ${String(index)}`,
	match: "word",
	reply: `Reply ${String(index)}\n# with a heading`,
});

const full = Array.from({ length: AUTO_RESPONDER_LIMITS.maxPerGuild }, (_, index) => responder(index));

/** Every component in the tree, the container itself included, which is what Discord's 40 counts. */
function componentCount(value: unknown): number {
	if (typeof value !== "object" || value === null) return 0;
	const node = value as { type?: number; components?: unknown[]; accessory?: unknown };
	const own = typeof node.type === "number" ? 1 : 0;
	const children = (node.components ?? []).reduce<number>((total, child) => total + componentCount(child), 0);
	return own + children + componentCount(node.accessory);
}

describe("autoResponderHub", () => {
	/** A button per responder would pass Discord's 40-component limit long before the cap. */
	it("fits a full server inside Discord's component limit", () => {
		const panel = autoResponderHub(full, OWNER);

		expect(componentCount(panel.components[0]?.toJSON())).toBeLessThanOrEqual(40);
	});

	it("offers every responder in one menu, and no New button once full", () => {
		const panel = autoResponderHub(full, OWNER);
		const json = JSON.stringify(panel.components[0]?.toJSON());
		const menu = (
			panel.components[0]?.toJSON() as {
				components: { type: ComponentType; components?: { type: ComponentType; options?: unknown[] }[] }[];
			}
		).components
			.flatMap((part) => part.components ?? [])
			.find((part) => part.type === ComponentType.StringSelect);

		expect(menu?.options).toHaveLength(AUTO_RESPONDER_LIMITS.maxPerGuild);
		expect(buttonsOf(panel).find((button) => button.label === "New auto-responder")?.disabled).toBe(true);
		expect(json).toContain("as many as a server can keep");
	});

	it("puts the owner last in every control, as the router expects", () => {
		for (const id of idsOf(autoResponderHub(full.slice(0, 3), OWNER))) {
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	/** A reply's own heading or code block would otherwise reshape the list around it. */
	it("flattens each reply in the list", () => {
		const text = textOf(autoResponderHub([responder(1)], OWNER));

		expect(text).toContain("→ Reply 1 # with a heading");
		expect(text).not.toContain("\n# with a heading");
	});

	it("says what to do on a server with none", () => {
		const panel = autoResponderHub([], OWNER);

		expect(textOf(panel)).toContain("None yet");
		expect(buttonsOf(panel).find((button) => button.label === "New auto-responder")?.disabled).toBe(false);
	});

	/** It shows text somebody typed, and a prefix run posts it where everybody can see. */
	it("pings nobody the replies name", () => {
		expect(autoResponderHub([{ ...responder(1), reply: "@everyone" }], OWNER).allowedMentions).toEqual({ parse: [] });
	});
});

describe("autoResponderEditor", () => {
	it("asks before deleting, and only then offers the delete", () => {
		const labels = (confirmingDelete: boolean) =>
			buttonsOf(autoResponderEditor({ responder: responder(1), confirmingDelete }, OWNER)).map(
				(button) => button.label,
			);

		expect(labels(false)).toEqual(expect.arrayContaining(["Edit", "Change", "Delete", "All auto-responders"]));
		expect(labels(false)).not.toContain("Delete it");
		expect(labels(true)).toEqual(expect.arrayContaining(["Delete it", "Keep it"]));
	});

	it("carries the responder's id and then the owner in each of its controls", () => {
		const target = responder(7);

		for (const id of idsOf(autoResponderEditor({ responder: target }, OWNER))) {
			const { action, args } = parseCustomId(id);
			expect(args.at(-1)).toBe(OWNER);
			if (action !== "hub") expect(args[0]).toBe(target.id);
		}
	});

	it("pings nobody the reply names", () => {
		expect(autoResponderEditor({ responder: responder(1) }, OWNER).allowedMentions).toEqual({ parse: [] });
	});
});
