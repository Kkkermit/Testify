import { type Client } from "discord.js";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { dashboardUrl } from "@lib/dashboard.util";
import { formatNumber } from "@lib/format.util";

/** The start-up banner. */

const ansi = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	pink: "\u001b[38;5;213m",
	cyan: "\u001b[38;5;51m",
	green: "\u001b[38;5;84m",
	yellow: "\u001b[38;5;221m",
	grey: "\u001b[38;5;245m",
};

/** Rows are padded assuming every icon is two terminal columns wide. */
export const ICONS = {
	bot: "\u{1F916}",
	servers: "\u{1F30D}",
	members: "\u{1F465}",
	commands: "\u{1F4AC}",
	scope: "\u{1F4E1}",
	readyIn: "\u26A1",
	package: "\u{1F4E6}",
	loadedCommands: "\u{1F4C2}",
	buttons: "\u{1F518}",
	events: "\u26A1",
	messages: "\u{1F48C}",
	dashboard: "\u{1F517}",
} as const;

/** The shared in-progress glyph. */
const RELOAD_GLYPH = "\u21BB";

const LETTERS: Record<string, string[]> = {
	A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
	B: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ "],
	C: [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"],
	D: ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
	E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
	F: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "██║     ", "╚═╝     "],
	G: [" ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
	H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
	I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
	J: ["     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ "],
	K: ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
	L: ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"],
	M: ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
	N: ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"],
	O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
	P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
	Q: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ "],
	R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
	S: ["███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝"],
	T: ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
	U: ["██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
	V: ["██╗   ██╗", "██║   ██║", "██║   ██║", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚═══╝  "],
	W: ["██╗    ██╗", "██║    ██║", "██║ █╗ ██║", "██║███╗██║", "╚███╔███╔╝", " ╚══╝╚══╝ "],
	X: ["██╗  ██╗", "╚██╗██╔╝", " ╚███╔╝ ", " ██╔██╗ ", "██╔╝ ██╗", "╚═╝  ╚═╝"],
	Y: ["██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   "],
	Z: ["███████╗", "╚══███╔╝", "  ███╔╝ ", " ███╔╝  ", "███████╗", "╚══════╝"],
	" ": ["   ", "   ", "   ", "   ", "   ", "   "],
};

/** Turns a word into six lines of block capitals. */
export function bigText(text: string): string[] {
	const glyphs = [...text.toUpperCase()].map((character) => LETTERS[character]).filter((glyph) => glyph !== undefined);
	if (glyphs.length === 0) return [];

	return Array.from({ length: 6 }, (_unused, line) => glyphs.map((glyph) => glyph[line] ?? "").join(""));
}

export interface BannerFacts {
	name: string;
	servers: number;
	members: number;
	commands: number;
	prefix: string;
	scope: string;
	startupMs: number;
	/** What the loader found on disk. */
	loaded: { commands: number; buttons: number; events: number; messageHandlers: number };
	/** True under `npm run dev`, where tsx restarts the process whenever a file is saved. */
	watching: boolean;
	/** Where a browser opens the dashboard — Vite's port in development, not the one the API binds. */
	dashboardUrl: string | null;
}

/** Kept separate from printing so it can be tested without capturing stdout. */
export function bannerLines(facts: BannerFacts, colour: boolean): string[] {
	const paint = (code: string, text: string): string => (colour ? `${code}${text}${ansi.reset}` : text);

	const art = bigText(facts.name);
	const width = Math.max(64, ...art.map((line) => [...line].length));
	const rule = "═".repeat(width);

	const fact = (icon: string, label: string, value: string): string =>
		`  ${icon} ${paint(ansi.cyan, `${label.padEnd(11)}:`)} ${paint(ansi.bold, value)}`;

	const thin = "─".repeat(width);

	return [
		"",
		paint(ansi.pink, rule),
		...art.map((line) => paint(ansi.pink, line)),
		paint(ansi.pink, rule),
		"",
		`  ${paint(ansi.green, "✓")} ${paint(ansi.bold, "Online and ready")}`,
		"",
		fact(ICONS.bot, "Bot", facts.name),
		fact(ICONS.servers, "Servers", formatNumber(facts.servers)),
		fact(ICONS.members, "Members", formatNumber(facts.members)),
		fact(ICONS.commands, "Commands", `${formatNumber(facts.commands)} Slash [/] and Prefix [${facts.prefix}]`),
		fact(ICONS.scope, "Visible in", facts.scope),
		fact(ICONS.readyIn, "Ready in", `${paint(ansi.green, "➜")}  ${formatNumber(facts.startupMs)}ms`),
		...(facts.dashboardUrl === null ? [] : [fact(ICONS.dashboard, "Dashboard", paint(ansi.green, facts.dashboardUrl))]),
		"",
		paint(ansi.grey, thin),
		`  ${paint(ansi.bold, `${ICONS.package} Loaded from disk`)}`,
		"",
		fact(ICONS.loadedCommands, "Commands", `${formatNumber(facts.loaded.commands)} loaded`),
		fact(ICONS.buttons, "Buttons", `${formatNumber(facts.loaded.buttons)} loaded`),
		fact(ICONS.events, "Events", `${formatNumber(facts.loaded.events)} loaded`),
		fact(ICONS.messages, "Messages", `${formatNumber(facts.loaded.messageHandlers)} loaded`),
		"",
		...(facts.watching ? [`  ${paint(ansi.yellow, RELOAD_GLYPH)} ${paint(ansi.bold, "Hot reload is on")}`, ""] : []),
		paint(ansi.grey, `  ${theme.repository}`),
		"",
	];
}

export function printBanner(
	client: TestifyClient,
	ready: Client<true>,
	prefix: string,
	scope: string,
	loaded: BannerFacts["loaded"],
): void {
	const lines = bannerLines(
		{
			name: ready.user.username,
			servers: ready.guilds.cache.size,
			members: ready.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
			commands: client.commands.size,
			prefix,
			scope,
			loaded,
			startupMs: Date.now() - client.startedAt,
			watching: client.env.NODE_ENV === "development",
			dashboardUrl: dashboardUrl(client.env),
		},
		process.stdout.isTTY === true,
	);

	process.stdout.write(`${lines.join("\n")}\n`);
}

/** Printed when tsx tears the process down to restart it. */
export function printReloading(): void {
	const glyph = process.stdout.isTTY === true ? `${ansi.yellow}${RELOAD_GLYPH}${ansi.reset}` : RELOAD_GLYPH;
	process.stdout.write(`\n  ${glyph} Change detected \u2014 reloading\u2026\n\n`);
}
