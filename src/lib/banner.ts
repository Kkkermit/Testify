import { type Client } from "discord.js";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { formatNumber } from "@lib/format";

/**
 * The start-up banner. Printed rather than logged: it is for a human watching a
 * terminal, and a log drain should not have to carry ASCII art. Colour is
 * dropped automatically when the output is not a terminal.
 */

const ansi = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	pink: "\u001b[38;5;213m",
	cyan: "\u001b[38;5;51m",
	green: "\u001b[38;5;84m",
	grey: "\u001b[38;5;245m",
};

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

/** Turns a word into six lines of block capitals. Unknown characters are dropped. */
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
}

/** Kept separate from printing so it can be tested without capturing stdout. */
export function bannerLines(facts: BannerFacts, colour: boolean): string[] {
	const paint = (code: string, text: string): string => (colour ? `${code}${text}${ansi.reset}` : text);

	const art = bigText(facts.name);
	const width = Math.max(64, ...art.map((line) => [...line].length));
	const rule = "═".repeat(width);

	const fact = (label: string, value: string): string =>
		`  ${paint(ansi.cyan, label.padEnd(12))}${paint(ansi.bold, value)}`;

	return [
		"",
		paint(ansi.pink, rule),
		...art.map((line) => paint(ansi.pink, line)),
		paint(ansi.pink, rule),
		"",
		`  ${paint(ansi.green, "✓")} ${paint(ansi.bold, "Online and ready")}`,
		"",
		fact("Bot", facts.name),
		fact("Servers", formatNumber(facts.servers)),
		fact("Members", formatNumber(facts.members)),
		fact("Commands", `${formatNumber(facts.commands)}   /  and  ${facts.prefix}`),
		fact("Visible in", facts.scope),
		fact("Ready in", `${formatNumber(facts.startupMs)}ms`),
		"",
		paint(ansi.grey, `  ${theme.repository}`),
		"",
	];
}

export function printBanner(client: TestifyClient, ready: Client<true>, prefix: string, scope: string): void {
	const lines = bannerLines(
		{
			name: ready.user.username,
			servers: ready.guilds.cache.size,
			members: ready.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0),
			commands: client.commands.size,
			prefix,
			scope,
			startupMs: Date.now() - client.startedAt,
		},
		process.stdout.isTTY === true,
	);

	process.stdout.write(`${lines.join("\n")}\n`);
}
