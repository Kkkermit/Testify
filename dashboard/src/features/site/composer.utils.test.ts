import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_PREFIX } from "@testify/shared";
import { framesFor, menuFor, paletteFrom, prefixLine } from "@/features/site/composer.utils";
import { SCENES } from "@/features/site/landing.content";

const ROOT = resolve(__dirname, "..", "..", "..", "..");
const palette = paletteFrom(readFileSync(resolve(ROOT, "docs", "commands.md"), "utf8"));
const scene = { command: "remind me", prefixName: "remindme", options: [{ name: "in", value: "2h" }] };

describe("the composer's commands", () => {
	it("reads every command the generated list holds", () => {
		expect(palette.length).toBeGreaterThan(50);
		expect(palette.find((command) => command.name === "play")?.description).toMatch(/plays/i);
	});

	/** The hero types real commands, so a renamed command, option or alias fails here rather than lying on the front page. */
	it("types only commands, options and aliases the bot declares", () => {
		const wrong = SCENES.flatMap((entry) => {
			const [root = ""] = entry.command.split(" ");
			const [alias = ""] = entry.prefixName.split(" ");
			const source = commandSource(root);
			return [
				...(palette.some((command) => command.name === root) ? [] : [`/${root}`]),
				...entry.options.filter((option) => !source.includes(`name: "${option.name}"`)).map((option) => option.name),
				...(source.includes(`"${alias}"`) ? [] : [`${DEFAULT_PREFIX}${alias}`]),
			];
		});

		expect(wrong).toEqual([]);
	});
});

/** A command's own file, wherever its category put it. */
function commandSource(name: string): string {
	const commands = resolve(ROOT, "src", "commands");
	const folder = readdirSync(commands).find((entry) => existsSync(resolve(commands, entry, `${name}.command.ts`)));
	return folder === undefined ? "" : readFileSync(resolve(commands, folder, `${name}.command.ts`), "utf8");
}

describe("framesFor", () => {
	it("types the name with Discord's menu open, picks it, then types each value", () => {
		const frames = framesFor(scene, palette);

		expect(frames[0]).toMatchObject({ typing: "", options: [] });
		expect(frames.find((frame) => frame.typing === "rem")?.menu.map((command) => command.name)).toContain("remind");
		expect(frames.findIndex((frame) => frame.typing === null)).toBe("remind".length + 1);
		expect(frames.at(-1)).toMatchObject({ typing: null, options: [{ name: "in", value: "2h" }], menu: [] });
		// The finished line is held long enough to read, every keystroke is quick.
		expect(frames.at(-1)?.delayMs).toBeGreaterThan(frames[1]?.delayMs ?? 0);
	});

	it("offers at most five commands, each starting with what is typed", () => {
		const menu = menuFor(palette, "");

		expect(menu).toHaveLength(5);
		expect(menuFor(palette, "pl").every((command) => command.name.startsWith("pl"))).toBe(true);
	});
});

describe("prefixLine", () => {
	it("types the same command with the prefix and the values in order", () => {
		expect(prefixLine(scene, DEFAULT_PREFIX)).toBe("t?remindme 2h");
	});
});
