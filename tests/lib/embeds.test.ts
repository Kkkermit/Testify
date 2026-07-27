import { theme } from "@config/theme";
import { embed, errorEmbed, successEmbed, withPageFooter } from "@lib/embeds";

describe("embed", () => {
	it("colours by category", () => {
		expect(embed({ category: "economy" }).data.color).toBe(embed({ colour: "DarkOrange" }).data.color);
	});

	it("prefers an explicit colour over the category", () => {
		const built = embed({ category: "economy", colour: "Red" });
		expect(built.data.color).toBe(embed({ colour: "Red" }).data.color);
	});

	it("always sets a footer, because Discord rejects an empty one", () => {
		expect(embed({}).data.footer?.text).toBe(theme.name);
		expect(embed({ footer: "" }).data.footer?.text).toBe(theme.name);
		expect(embed({ footer: "Page 1" }).data.footer?.text).toBe("Page 1");
	});

	it("clamps a description Discord would reject", () => {
		const built = embed({ description: "x".repeat(5_000) });
		expect(built.data.description?.length).toBeLessThanOrEqual(4_096);
	});

	it("clamps field names and values", () => {
		const built = embed({ fields: [{ name: "n".repeat(400), value: "v".repeat(2_000) }] });
		expect(built.data.fields?.[0]?.name.length).toBeLessThanOrEqual(256);
		expect(built.data.fields?.[0]?.value.length).toBeLessThanOrEqual(1_024);
	});

	it("omits the author when none was given", () => {
		expect(embed({}).data.author).toBeUndefined();
	});

	it("can turn the timestamp off", () => {
		expect(embed({ timestamp: false }).data.timestamp).toBeUndefined();
		expect(embed({}).data.timestamp).toBeDefined();
	});
});

describe("the shorthand embeds", () => {
	it("prefixes an error with the error emoji", () => {
		expect(errorEmbed("Nope.").data.description).toBe(`${theme.emoji.error} Nope.`);
	});

	it("prefixes a success with the tick", () => {
		expect(successEmbed("Done.").data.description).toBe(`${theme.emoji.success} Done.`);
	});
});

describe("withPageFooter", () => {
	it("adds the page counter", () => {
		expect(withPageFooter(embed({ footer: "" }), 1, 5).data.footer?.text).toContain("Page 2 of 5");
	});

	it("keeps whatever footer was already there", () => {
		const built = withPageFooter(embed({ footer: "12 items" }), 0, 3);
		expect(built.data.footer?.text).toBe("Page 1 of 3 • 12 items");
	});
});
