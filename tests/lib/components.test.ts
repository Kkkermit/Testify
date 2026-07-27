import { ButtonStyle } from "discord.js";
import { parseCustomId } from "@core/button";
import { button, confirmRow, disableAll, linkButton, navRow, row } from "@lib/components.util";

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
