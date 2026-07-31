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
	selectRow,
} from "@lib/components.util";
import { duplicateIds } from "@tests/helpers/containers";

const OWNER = "111111111111111111";

describe("button", () => {
	it("defaults to a secondary style", () => {
		expect(button({ id: "a:b" }).data.style).toBe(ButtonStyle.Secondary);
	});

	it("builds a link button with no custom ID", () => {
		const built = linkButton("Docs", "https://example.com");
		expect(built.data.style).toBe(ButtonStyle.Link);
		expect(built.data).not.toHaveProperty("custom_id");
	});
});

describe("navRow", () => {
	it("disables the back arrows on the first page", () => {
		const components = navRow("help", 0, 5, OWNER).components;
		expect(components[0]?.data.disabled).toBe(true);
		expect(components[1]?.data.disabled).toBe(true);
		expect(components[3]?.data.disabled).toBe(false);
	});

	it("disables the forward arrows on the last page", () => {
		const components = navRow("help", 4, 5, OWNER).components;
		expect(components[3]?.data.disabled).toBe(true);
		expect(components[4]?.data.disabled).toBe(true);
	});

	it("carries the page and the owner in every custom ID", () => {
		for (const component of navRow("inventory", 2, 9, OWNER, "key").components) {
			const id = (component.data as { custom_id?: string }).custom_id;
			if (id === undefined) continue;
			const parsed = parseCustomId(id);
			expect(parsed.id).toBe("inventory");
			expect(parsed.args.at(-1)).toBe(OWNER);
		}
	});

	/**
	 * Discord rejects the whole message with COMPONENT_CUSTOM_ID_DUPLICATED when two components share an ID — disabled
	 * ones included.
	 */
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

	it("still points each arrow at the right page", () => {
		const pageOf = (index: number): string | undefined => {
			const id = (navRow("board", 4, 9, OWNER, "key").components[index]?.data as { custom_id?: string }).custom_id;
			return id === undefined ? undefined : parseCustomId(id).args[1];
		};

		expect([pageOf(0), pageOf(1), pageOf(3), pageOf(4)]).toEqual(["0", "3", "5", "8"]);
	});
});

describe("quickAmountRow", () => {
	/** A wallet of 0 made all three amounts 0, so the panel could not be sent at all. */
	it.each([0, 1, 2, 3, 4, 100, 1_000_000])("gives every button a distinct custom ID for a balance of %s", (max) => {
		expect(duplicateIds(quickAmountRow("money", "dep", max, OWNER))).toEqual([]);
	});

	it("still carries the amount as the first argument", () => {
		const [quarter] = quickAmountRow("money", "dep", 100, OWNER).components;
		const id = (quarter?.data as { custom_id?: string }).custom_id ?? "";

		expect(parseCustomId(id).args[0]).toBe("25");
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

	it("defaults to choosing exactly one, enabled", () => {
		const data = select({ id: "pick", options: [option("a")] }).toJSON();

		expect(data.min_values).toBe(1);
		expect(data.max_values).toBe(1);
		expect(data.disabled).toBe(false);
	});

	it("takes an explicit range and disabled state", () => {
		const data = select({
			id: "pick",
			options: [option("a"), option("b")],
			minValues: 0,
			maxValues: 2,
			disabled: true,
		}).toJSON();

		expect(data).toMatchObject({ min_values: 0, max_values: 2, disabled: true });
	});

	it("sets a placeholder only when given one", () => {
		expect(select({ id: "p", options: [option("a")], placeholder: "Pick one" }).toJSON().placeholder).toBe("Pick one");
		expect(select({ id: "p", options: [option("a")] }).toJSON().placeholder).toBeUndefined();
	});
});

describe("selectRow", () => {
	it("wraps a menu in its own action row", () => {
		const menu = select({ id: "pick", options: [new StringSelectMenuOptionBuilder().setLabel("a").setValue("a")] });
		const data = selectRow(menu).toJSON();

		expect(data.components).toHaveLength(1);
	});
});

describe("row", () => {
	it("groups components into one row", () => {
		expect(row(button({ id: "a", label: "A" }), button({ id: "b", label: "B" })).toJSON().components).toHaveLength(2);
	});

	it("builds an empty row without complaint", () => {
		expect(row().toJSON().components).toHaveLength(0);
	});
});
