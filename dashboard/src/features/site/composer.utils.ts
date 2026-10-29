/** The hero's Discord message box as data: each frame is one keystroke of a real command, typed both ways. */

export interface PaletteCommand {
	name: string;
	description: string;
}

export interface ComposerOption {
	name: string;
	value: string;
}

export interface ComposerScene {
	/** As Discord shows it once picked: a command and, where it has one, its subcommand. */
	command: string;
	options: ComposerOption[];
	/** The same command as a prefix alias, which is how it is typed without a slash. */
	prefixName: string;
}

export interface ComposerFrame {
	/** What has been typed of the command's name, or null once it has been picked from the menu. */
	typing: string | null;
	options: ComposerOption[];
	/** The commands Discord would offer for what is typed so far. */
	menu: PaletteCommand[];
	delayMs: number;
}

const KEYSTROKE_MS = 70;
const VALUE_KEYSTROKE_MS = 45;
const PICK_MS = 500;
const HOLD_MS = 2_600;
const MENU_SIZE = 5;

/** Every command listed in the generated `docs/commands.md`, in its own order, with the description it gives Discord. */
export function paletteFrom(markdown: string): PaletteCommand[] {
	const rows = markdown.matchAll(/^\| `\/([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|/gm);
	return [...rows].map(([, name = "", description = ""]) => ({ name, description }));
}

export function menuFor(palette: readonly PaletteCommand[], typed: string): PaletteCommand[] {
	return palette.filter((command) => command.name.startsWith(typed)).slice(0, MENU_SIZE);
}

/** One scene, keystroke by keystroke: the name with Discord's menu open, then each option's value, then a pause. */
export function framesFor(scene: ComposerScene, palette: readonly PaletteCommand[]): ComposerFrame[] {
	const [root = ""] = scene.command.split(" ");
	const frames: ComposerFrame[] = [];

	for (let length = 0; length <= root.length; length += 1) {
		const typing = root.slice(0, length);
		frames.push({ typing, options: [], menu: menuFor(palette, typing), delayMs: KEYSTROKE_MS });
	}
	frames.push({ typing: null, options: [], menu: [], delayMs: PICK_MS });

	const typed: ComposerOption[] = [];
	for (const option of scene.options) {
		for (let length = 0; length <= option.value.length; length += 1) {
			frames.push({
				typing: null,
				options: [...typed, { name: option.name, value: option.value.slice(0, length) }],
				menu: [],
				delayMs: VALUE_KEYSTROKE_MS,
			});
		}
		typed.push(option);
	}

	const last = frames.at(-1);
	if (last !== undefined) last.delayMs = HOLD_MS;
	return frames;
}

/** The finished line, which is what a reader who asked for less motion sees, and what a screen reader is told. */
export function finishedFrame(scene: ComposerScene): ComposerFrame {
	return { typing: null, options: scene.options, menu: [], delayMs: 0 };
}

/** The scene typed without a slash: the prefix, the alias, and the values in the order the options take them. */
export function prefixLine(scene: ComposerScene, prefix: string): string {
	return [`${prefix}${scene.prefixName}`, ...scene.options.map((option) => option.value)].join(" ");
}
