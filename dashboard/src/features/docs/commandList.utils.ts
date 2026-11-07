import { type BotFeature, commandIsOff, partIsOff } from "@testify/shared";

export const COMMAND_LIST = "docs/commands.md";

const COMMAND_ROW = /^\|\s*`\/([^`\s]+)`\s*\|/;
const MENU_ROW = /^\|\s*\*\*(.+?)\*\*\s*\|/;
const SUMMARY_ROW = /^\|\s*\[(.+?)\]\(#[^)]*\)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$/;
const BADGE = /!\[(commands|subcommands|prefix aliases): (\d+)\]\(https:\/\/img\.shields\.io\/badge\/([^-]+)-(\d+)-/g;

// What `npm run docs:commands` writes between chips; the file is shown as written, in English.
const GENERATED_SEPARATOR = ", ";

const cellsOf = (row: string): string[] => row.split(/(?<!\\)\|/);
const chipsOf = (cell: string): string[] => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");

interface Removed {
	commands: number;
	subcommands: number;
	aliases: number;
}

function trimRow(row: string, off: ReadonlySet<BotFeature>): { row: string | null; removed: Removed } {
	const name = COMMAND_ROW.exec(row)?.[1] ?? "";
	const cells = cellsOf(row);
	const subs = chipsOf(cells[3] ?? "");
	const aliases = chipsOf(cells[4] ?? "").length;

	if (commandIsOff(off, name)) return { row: null, removed: { commands: 1, subcommands: subs.length, aliases } };

	const kept = subs.filter((sub) => !commandIsOff(off, name, sub));
	if (kept.length === subs.length) return { row, removed: { commands: 0, subcommands: 0, aliases: 0 } };

	cells[3] = ` ${kept.length === 0 ? "—" : kept.map((sub) => `\`${sub}\``).join(GENERATED_SEPARATOR)} `;
	return { row: cells.join("|"), removed: { commands: 0, subcommands: subs.length - kept.length, aliases: 0 } };
}

/** The command list without what a switched-off feature owns, its counts lowered by what was taken out. */
export function withoutSwitchedOff(markdown: string, off: ReadonlySet<BotFeature>): string {
	if (off.size === 0) return markdown;

	const lines = markdown.split("\n");
	const headings = lines.flatMap((line, at) => (line.startsWith("## ") ? [at] : []));
	const kept: string[] = lines.slice(0, headings[0] ?? lines.length);
	const total: Removed = { commands: 0, subcommands: 0, aliases: 0 };
	const bySection = new Map<string, Removed | null>();

	headings.forEach((start, index) => {
		const title = (lines[start] ?? "").slice(3).trim();
		const section = lines.slice(start, headings[index + 1] ?? lines.length);
		const removed: Removed = { commands: 0, subcommands: 0, aliases: 0 };
		let rows = 0;
		let left = 0;

		const out = section.flatMap((line) => {
			if (COMMAND_ROW.test(line)) {
				rows += 1;
				const trimmed = trimRow(line, off);
				removed.commands += trimmed.removed.commands;
				removed.subcommands += trimmed.removed.subcommands;
				removed.aliases += trimmed.removed.aliases;
				if (trimmed.row === null) return [];
				left += 1;
				return [trimmed.row];
			}
			const menu = MENU_ROW.exec(line)?.[1];
			if (menu !== undefined) {
				rows += 1;
				if (partIsOff(off, "menus", menu)) return [];
				left += 1;
			}
			return [line];
		});

		total.commands += removed.commands;
		total.subcommands += removed.subcommands;
		total.aliases += removed.aliases;

		// A category with every command switched off goes, heading and all, and so does its line in the summary.
		const emptied = rows > 0 && left === 0;
		bySection.set(title, emptied ? null : removed);
		if (!emptied) kept.push(...out);
	});

	const lowerBy: Record<string, number> = {
		commands: total.commands,
		subcommands: total.subcommands,
		"prefix aliases": total.aliases,
	};

	return kept
		.flatMap((line) => {
			const summary = SUMMARY_ROW.exec(line);
			if (summary === null) return [line];
			const [, title = "", commands = "0", subcommands = "0"] = summary;
			const removed = bySection.get(title);
			if (removed === null) return [];
			if (removed === undefined) return [line];
			const link = line.slice(0, line.indexOf("|", 1) + 1);
			return [
				`${link} ${String(Number(commands) - removed.commands)} | ${String(Number(subcommands) - removed.subcommands)} |`,
			];
		})
		.join("\n")
		.replace(BADGE, (_whole, label: string, value: string, encoded: string) => {
			const count = String(Number(value) - (lowerBy[label] ?? 0));
			return `![${label}: ${count}](https://img.shields.io/badge/${encoded}-${count}-`;
		});
}
