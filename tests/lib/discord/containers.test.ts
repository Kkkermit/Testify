import { ComponentType, MessageFlags } from "discord.js";
import { button } from "@lib/discord/components.util";
import { container, containerMessage, sectionWithButton, text } from "@lib/discord/containers.util";

const json = (builder: { toJSON(): unknown }): Record<string, unknown> => builder.toJSON() as Record<string, unknown>;

describe("containerMessage", () => {
	/** Discord rejects the message outright without this flag. */
	it("sets the Components V2 flag", () => {
		expect(containerMessage(container({ parts: [text("hi")] })).flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** The flag makes `embeds` and `content` illegal, so the payload must not carry them. */
	it("carries only components, never embeds or content", () => {
		const payload = containerMessage(container({ parts: [text("hi")] })) as unknown as Record<string, unknown>;

		expect(Object.keys(payload).sort()).toEqual(["components", "flags"]);
	});
});

describe("sectionWithButton", () => {
	/** The point of V2: the control sits beside the thing it acts on. */
	it("puts the button on the section rather than in a row below", () => {
		const built = json(sectionWithButton("Buy me", button({ id: "a:b", label: "Buy" })));
		const accessory = built.accessory as { type: number; label: string };

		expect(accessory.type).toBe(ComponentType.Button);
		expect(accessory.label).toBe("Buy");
	});
});

describe("container", () => {
	/** A colour is never worth failing a message over. */
	it("falls back rather than throwing on a colour it cannot read", () => {
		expect(json(container({ accent: "NotAColour" as never, parts: [text("x")] })).accent_color).toBe(0x5865f2);
	});

	it("colours itself by category, so V2 matches the embeds beside it", () => {
		expect(json(container({ category: "economy", parts: [text("x")] })).accent_color).toEqual(expect.any(Number));
	});
});
