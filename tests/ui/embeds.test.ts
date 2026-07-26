import { Category } from "../../src/config/categories";
import { LIMITS } from "../../src/config/constants";
import { embed, errorEmbed, infoEmbed, successEmbed, warningEmbed, withPageFooter } from "../../src/ui/embeds";

describe("embed factory", () => {
	it("applies the house style with no options", () => {
		const built = embed({}).toJSON();

		expect(built.author?.name).toContain("Testify");
		expect(built.footer?.text).toBeDefined();
		expect(built.timestamp).toBeDefined();
		expect(built.color).toBeDefined();
	});

	it("colours by category", () => {
		const economy = embed({ category: Category.Economy }).toJSON();
		const moderation = embed({ category: Category.Moderation }).toJSON();
		expect(economy.color).not.toBe(moderation.color);
	});

	it("prefers an explicit colour over the category", () => {
		const built = embed({ category: Category.Economy, color: "#123456" }).toJSON();
		expect(built.color).toBe(0x123456);
	});

	it("clamps oversized titles, descriptions and fields", () => {
		const built = embed({
			title: "t".repeat(500),
			description: "d".repeat(6_000),
			fields: [{ name: "n".repeat(500), value: "v".repeat(2_000), inline: false }],
		}).toJSON();

		expect(built.title!.length).toBeLessThanOrEqual(LIMITS.embedTitle);
		expect(built.description!.length).toBeLessThanOrEqual(LIMITS.embedDescription);
		expect(built.fields![0]!.name.length).toBeLessThanOrEqual(LIMITS.embedTitle);
		expect(built.fields![0]!.value.length).toBeLessThanOrEqual(LIMITS.embedFieldValue);
	});

	it("omits the timestamp when asked", () => {
		expect(embed({ timestamp: false }).toJSON().timestamp).toBeUndefined();
	});

	it("returns a builder that can still be chained onto", () => {
		const built = embed({ title: "Hi" }).setImage("https://example.invalid/a.png").toJSON();
		expect(built.image?.url).toBe("https://example.invalid/a.png");
	});
});

describe("status embeds", () => {
	it("prefixes each status with its own marker", () => {
		expect(errorEmbed("nope").toJSON().description).toContain("nope");
		expect(successEmbed("done").toJSON().description).toContain("done");
		expect(warningEmbed("careful").toJSON().description).toContain("careful");
		expect(infoEmbed("note").toJSON().description).toContain("note");
	});

	it("gives errors and successes different colours", () => {
		expect(errorEmbed("a").toJSON().color).not.toBe(successEmbed("a").toJSON().color);
	});
});

describe("withPageFooter", () => {
	it("keeps existing footer text", () => {
		const built = withPageFooter(embed({ footer: "Economy" }), 1, 5).toJSON();
		expect(built.footer?.text).toBe("Page 2 of 5 • Economy");
	});

	it("never shows a zero page count", () => {
		const built = withPageFooter(embed({}), 0, 0).toJSON();
		expect(built.footer?.text).toContain("Page 1 of 1");
	});

	// Discord rejects an empty footer outright, so the factory substitutes the default.
	it("falls back to the default footer when given an empty string", () => {
		expect(embed({ footer: "" }).toJSON().footer?.text).not.toBe("");
	});
});
