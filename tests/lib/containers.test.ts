import { ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import { button, row } from "@lib/components.util";
import {
	container,
	containerMessage,
	divider,
	sectionWithButton,
	sectionWithThumbnail,
	text,
} from "@lib/containers.util";

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

describe("text", () => {
	it("keeps the markdown it was given", () => {
		expect(json(text("**bold**")).content).toBe("**bold**");
	});
});

describe("divider", () => {
	it("draws a line by default", () => {
		expect(json(divider()).divider).toBe(true);
	});

	it("can be invisible spacing instead", () => {
		expect(json(divider({ spacer: true })).divider).toBe(false);
	});

	it("takes a larger gap", () => {
		expect(json(divider({ large: true })).spacing).not.toBe(json(divider()).spacing);
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

	it("keeps the text alongside it", () => {
		const built = json(sectionWithButton("Buy me", button({ id: "a:b", label: "Buy" })));
		const components = built.components as { content: string }[];

		expect(components[0]?.content).toBe("Buy me");
	});

	it("carries a disabled button through", () => {
		const built = json(sectionWithButton("x", button({ id: "a:b", label: "No", disabled: true })));
		expect((built.accessory as { disabled?: boolean }).disabled).toBe(true);
	});
});

describe("sectionWithThumbnail", () => {
	it("attaches the image as the accessory", () => {
		const built = json(sectionWithThumbnail("Track", "https://cdn.test/art.png"));
		const accessory = built.accessory as { type: number; media: { url: string } };

		expect(accessory.type).toBe(ComponentType.Thumbnail);
		expect(accessory.media.url).toBe("https://cdn.test/art.png");
	});

	it("adds alt text when given some", () => {
		const built = json(sectionWithThumbnail("Track", "https://cdn.test/art.png", "Album art"));
		expect((built.accessory as { description?: string }).description).toBe("Album art");
	});
});

describe("container", () => {
	it("keeps its parts in the order they were passed", () => {
		const built = json(
			container({
				parts: [text("one"), divider(), sectionWithButton("two", button({ id: "a:b", label: "Go" }))],
			}),
		);
		const types = (built.components as { type: number }[]).map((component) => component.type);

		expect(types).toEqual([ComponentType.TextDisplay, ComponentType.Separator, ComponentType.Section]);
	});

	it("accepts an action row alongside the rest", () => {
		const built = json(
			container({ parts: [text("x"), row(button({ id: "a:b", label: "Go", style: ButtonStyle.Primary }))] }),
		);

		expect((built.components as { type: number }[]).at(-1)?.type).toBe(ComponentType.ActionRow);
	});

	it("colours itself by category, so V2 matches the embeds beside it", () => {
		expect(json(container({ category: "economy", parts: [text("x")] })).accent_color).toEqual(expect.any(Number));
	});

	it("leaves the accent off when no category is given", () => {
		expect(json(container({ parts: [text("x")] })).accent_color).toBeUndefined();
	});

	it("builds an empty container without throwing", () => {
		expect(() => container({ parts: [] })).not.toThrow();
	});
});
