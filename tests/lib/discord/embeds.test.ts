import { categoryColour, theme } from "@config/theme";
import { botName } from "@core/brand";
import { embed, refusalEmbed } from "@lib/discord/embeds.util";

describe("embed", () => {
	/** Read from the registry rather than spelled out, so repainting a category is not also a test edit. */
	it("colours by category", () => {
		expect(embed({ category: "economy" }).data.color).toBe(embed({ colour: categoryColour("economy") }).data.color);
	});

	it("always sets a footer, because Discord rejects an empty one", () => {
		expect(embed({}).data.footer?.text).toBe(botName());
		expect(embed({ footer: "" }).data.footer?.text).toBe(botName());
		expect(embed({ footer: "Page 1" }).data.footer?.text).toBe("Page 1");
	});

	it("clamps a description Discord would reject", () => {
		const built = embed({ description: "x".repeat(5_000) });
		expect(built.data.description?.length).toBeLessThanOrEqual(4_096);
	});

	it("can turn the timestamp off", () => {
		expect(embed({ timestamp: false }).data.timestamp).toBeUndefined();
		expect(embed({}).data.timestamp).toBeDefined();
	});
});

describe("refusalEmbed", () => {
	it("keeps a plain refusal as an error", () => {
		expect(refusalEmbed("Nope.").data.description).toBe(`${theme.emoji.error} Nope.`);
	});

	it("gives a titled refusal its own heading and no error cross", () => {
		const data = refusalEmbed({ title: "Under maintenance", message: "Back later." }).data;

		expect(data.title).toBe("Under maintenance");
		expect(data.description).toBe("Back later.");
	});
});
