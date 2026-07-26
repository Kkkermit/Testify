import { ButtonStyle } from "discord.js";
import { Namespace } from "../../src/core/customId";
import { button, confirmRow, disableAll, linkButton, navRow, row } from "../../src/ui/components";

describe("button", () => {
	it("defaults to the secondary style", () => {
		expect(button({ id: "a:b", label: "Go" }).toJSON().style).toBe(ButtonStyle.Secondary);
	});

	it("keeps the given style and label", () => {
		const built = button({ id: "a:b", label: "Go", style: ButtonStyle.Danger }).toJSON();
		expect(built.style).toBe(ButtonStyle.Danger);
		expect((built as { label?: string }).label).toBe("Go");
	});
});

describe("linkButton", () => {
	it("produces a link-style button carrying the url", () => {
		const built = linkButton("Docs", "https://example.invalid").toJSON();
		expect(built.style).toBe(ButtonStyle.Link);
		expect((built as { url?: string }).url).toBe("https://example.invalid");
	});
});

describe("confirmRow", () => {
	it("puts the owner id last so ownerOnly can read it", () => {
		const ids = confirmRow(Namespace.Reset, "economy", "owner-1")
			.toJSON()
			.components.map((component) => (component as { custom_id: string }).custom_id);

		expect(ids).toEqual(["reset:economy-yes:owner-1", "reset:economy-no:owner-1"]);
	});
});

describe("disableAll", () => {
	it("disables interactive components but leaves links usable", () => {
		const rows = disableAll([row(button({ id: "a:b", label: "Go" }), linkButton("Docs", "https://example.invalid"))]);
		const components = rows[0]!.toJSON().components as { disabled?: boolean; style: number }[];

		expect(components[0]!.disabled).toBe(true);
		expect(components[1]!.disabled).not.toBe(true);
	});
});

describe("navRow", () => {
	it("disables forward controls on the last page", () => {
		const components = navRow(Namespace.Page, 2, 3, "owner").toJSON().components as { disabled?: boolean }[];
		expect(components[3]!.disabled).toBe(true);
		expect(components[4]!.disabled).toBe(true);
		expect(components[0]!.disabled).toBe(false);
	});
});
