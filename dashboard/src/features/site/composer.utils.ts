export interface PaletteCommand {
	name: string;
	description: string;
}

export interface ComposerOption {
	name: string;
	value: string;
}

export interface ComposerScene {
	command: string;
	options: ComposerOption[];
	prefixName: string;
}

export interface ComposerFrame {
	typing: string | null;
	options: ComposerOption[];
	menu: PaletteCommand[];
	delayMs: number;
}

const KEYSTROKE_MS = 70;
const VALUE_KEYSTROKE_MS = 45;
const PICK_MS = 500;
const HOLD_MS = 2_600;
const MENU_SIZE = 5;

export function paletteFrom(markdown: string): PaletteCommand[] {
	const rows = markdown.matchAll(/^\| `\/([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|/gm);
	return [...rows].map(([, name = "", description = ""]) => ({ name, description }));
}

export function menuFor(palette: readonly PaletteCommand[], typed: string): PaletteCommand[] {
	return palette.filter((command) => command.name.startsWith(typed)).slice(0, MENU_SIZE);
}

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

export function finishedFrame(scene: ComposerScene): ComposerFrame {
	return { typing: null, options: scene.options, menu: [], delayMs: 0 };
}

export function prefixLine(scene: ComposerScene, prefix: string): string {
	return [`${prefix}${scene.prefixName}`, ...scene.options.map((option) => option.value)].join(" ");
}
