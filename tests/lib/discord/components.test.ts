import { ButtonStyle, StringSelectMenuOptionBuilder } from "discord.js";
import { parseCustomId } from "@core/button";
import {
	button,
	confirmRow,
	disableAll,
	linkButton,
	navRow,
	quickAmountRow,
	row,
	select,
} from "@lib/discord/components.util";
import { duplicateIds } from "@tests/helpers/containers";

const OWNER = "111111111111111111";

describe("button", () => {
	it("builds a link button with no custom ID", () => {
		const built = linkButton("Docs", "https://example.com");
		expect(built.data.style).toBe(ButtonStyle.Link);
		expect(built.data).not.toHaveProperty("custom_id");
	});
});

describe("navRow", () => {
	it("carries the page and the owner in every custom ID", () => {
		for (const component of navRow("inventory", 2, 9, OWNER, "key").components) {
			const id = (component.data as { custom_id?: string }).custom_id;
			if (id === undefined) continue;
			const parsed = parseCustomId(id);
			expect(parsed.id).toBe("inventory");
			expect(parsed.args.at(-1)).toBe(OWNER);
		}
	});

	/** Discord rejects a message where two components share a custom ID, disabled ones included. */
	it.each([
		["one page", 0, 1],
		["two pages, first", 0, 2],
		["two pages, last", 1, 2],
		["three pages, middle", 1, 3],
		["page one of many", 1, 9],
		["second to last", 7, 9],
		["last of many", 8, 9],
		["no pages at all", 0, 0],
	])("gives every button a distinct custom ID: %s", (_name, page, total) => {
		expect(duplicateIds(navRow("board", page, total, OWNER, "key"))).toEqual([]);
	});
});

describe("quickAmountRow", () => {
	/** A wallet of 0 made all three amounts 0, so the panel could not be sent at all. */
	it.each([0, 1, 2, 3, 4, 100, 1_000_000])("gives every button a distinct custom ID for a balance of %s", (max) => {
		expect(duplicateIds(quickAmountRow("money", "dep", max, OWNER))).toEqual([]);
	});

	it("disables what cannot be pressed on an empty balance", () => {
		const components = quickAmountRow("money", "dep", 0, OWNER).components;
		expect(components.slice(0, 3).every((control) => control.data.disabled === true)).toBe(true);
	});
});

describe("confirmRow", () => {
	it("puts the owner ID last so ownerOnly can read it", () => {
		const [confirm] = confirmRow("reset", "economy", OWNER).components;
		const id = (confirm?.data as { custom_id: string }).custom_id;
		expect(parseCustomId(id)).toEqual({ id: "reset", action: "economy-yes", args: [OWNER] });
	});
});

describe("disableAll", () => {
	it("disables everything except link buttons", () => {
		const rows = disableAll([row(button({ id: "a:b" }), linkButton("Docs", "https://example.com"))]);
		expect(rows[0]?.components[0]?.data.disabled).toBe(true);
		expect(rows[0]?.components[1]?.data.disabled).toBeUndefined();
	});
});

describe("select", () => {
	const option = (value: string): StringSelectMenuOptionBuilder =>
		new StringSelectMenuOptionBuilder().setLabel(value).setValue(value);

	it("carries the custom ID and options", () => {
		const data = select({ id: "pick", options: [option("a"), option("b")] }).toJSON();

		expect(data.custom_id).toBe("pick");
		expect(data.options).toHaveLength(2);
	});
});
