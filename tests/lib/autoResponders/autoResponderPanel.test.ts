import { parseCustomId } from "@core/button";
import { autoResponderEditor, autoResponderHub } from "@lib/autoResponders/autoResponderPanel.util";
import { AUTO_RESPONDER_LIMITS, type AutoResponder } from "@testify/shared";
import { idsOf, textOf } from "@tests/helpers/containers";

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

	/** It shows text somebody typed, and a prefix run posts it where everybody can see. */
	it("pings nobody the replies name", () => {
		expect(autoResponderHub([{ ...responder(1), reply: "@everyone" }], OWNER).allowedMentions).toEqual({ parse: [] });
	});
});

describe("autoResponderEditor", () => {
	it("pings nobody the reply names", () => {
		expect(autoResponderEditor({ responder: responder(1) }, OWNER).allowedMentions).toEqual({ parse: [] });
	});
});
