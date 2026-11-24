import { ButtonStyle, StringSelectMenuOptionBuilder } from "discord.js";
import { parseCustomId } from "@core/button";
import {
	button,
	channelSelect,
	confirmRow,
	disableAll,
	linkButton,
	modalForm,
	navRow,
	option,
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

	/** discord.js throws on text past Discord's caps, which took the whole panel down with it. */
	it("cuts every piece of component text to the length Discord allows", () => {
		const long = "x".repeat(300);
		const label = (built: { data: object }): number | undefined => (built.data as { label?: string }).label?.length;
		const lengths = {
			button: label(button({ id: "a:b", label: long })),
			link: label(linkButton(long, "https://example.com")),
			placeholder: channelSelect({ id: "a:c", placeholder: long }).data.placeholder?.length,
			option: option({ label: long, value: "v", description: long }).data.label?.length,
			modalTitle: modalForm({ id: "a", action: "b", title: long, fields: [] }).data.title?.length,
		};

		expect(lengths).toEqual({ button: 80, link: 80, placeholder: 150, option: 100, modalTitle: 45 });
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
	it("gives every button a distinct custom ID, on every page", () => {
		const pages: [string, number, number][] = [
			["one page", 0, 1],
			["two pages, first", 0, 2],
			["two pages, last", 1, 2],
			["three pages, middle", 1, 3],
			["page one of many", 1, 9],
			["second to last", 7, 9],
			["last of many", 8, 9],
			["no pages at all", 0, 0],
		];

		expect(
			pages
				.filter(([, page, total]) => duplicateIds(navRow("board", page, total, OWNER, "key")).length > 0)
				.map(([name]) => name),
		).toEqual([]);
	});
});

describe("quickAmountRow", () => {
	/** A wallet of 0 made all three amounts 0, so the panel could not be sent at all. */
	it("gives every button a distinct custom ID, whatever the balance", () => {
		const balances = [0, 1, 2, 3, 4, 100, 1_000_000];

		expect(balances.filter((max) => duplicateIds(quickAmountRow("money", "dep", max, OWNER)).length > 0)).toEqual([]);
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
	const choice = (value: string): StringSelectMenuOptionBuilder =>
		new StringSelectMenuOptionBuilder().setLabel(value).setValue(value);

	it("carries the custom ID and options", () => {
		const data = select({ id: "pick", options: [choice("a"), choice("b")] }).toJSON();

		expect(data.custom_id).toBe("pick");
		expect(data.options).toHaveLength(2);
	});
});
