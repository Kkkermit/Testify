import { type CommandSummary, type ManageableGuild } from "@testify/shared";
import { type TFunction } from "i18next";
import { FileText, type LucideIcon, Palette, ShieldQuestion, Terminal } from "lucide-react";
import { allNavItems, type NavAudience, navigationFor } from "@/config/navigation";
import { configurableAt } from "@/features/commands/commands.utils";

export type SearchKind = "screen" | "command" | "server";

export interface SearchEntry {
	id: string;
	kind: SearchKind;
	label: string;
	/** What the row says under its label, and more words to match on. */
	detail: string;
	to: string;
	icon: LucideIcon | null;
	/** Set on a server, whose row shows its picture instead of an icon. */
	guild?: ManageableGuild;
	/** Words that find the entry without being shown, such as a command's aliases. */
	terms: string[];
}

/** The pages outside the sidebar's groups, which the footer reaches. */
const EXTRA_PAGES = [
	{ to: "/appearance", labelKey: "nav.appearance", hintKey: "nav.appearanceHint", icon: Palette },
	{ to: "/terms", labelKey: "nav.terms", hintKey: "nav.termsHint", icon: FileText },
	{ to: "/privacy", labelKey: "nav.privacy", hintKey: "nav.privacyHint", icon: ShieldQuestion },
] as const;

export function searchEntries({
	t,
	guild,
	guilds,
	isOwner,
	commands,
}: NavAudience & {
	t: TFunction;
	guilds: readonly ManageableGuild[];
	commands: readonly CommandSummary[];
}): SearchEntry[] {
	const screens = [...allNavItems(navigationFor({ guild, isOwner })), ...EXTRA_PAGES].map<SearchEntry>((item) => ({
		id: `screen:${item.to}`,
		kind: "screen",
		label: t(item.labelKey),
		detail: item.hintKey === undefined ? "" : t(item.hintKey),
		to: item.to,
		icon: item.icon,
		terms: [],
	}));

	const servers = guilds
		.filter((candidate) => candidate.botPresent)
		.map<SearchEntry>((candidate) => ({
			id: `server:${candidate.id}`,
			kind: "server",
			label: candidate.name,
			detail: t("search.server"),
			to: `/guilds/${candidate.id}`,
			icon: null,
			guild: candidate,
			terms: [],
		}));

	const commandList = guild === undefined ? "/commands" : `/guilds/${guild.id}/commands`;
	const commandEntries = commands.map<SearchEntry>((command) => {
		const place = configurableAt(command, guild?.id ?? null);
		// The sidebar's own name for the screen, which is translated where the command map's is not.
		const screen = place === null ? null : (screens.find((entry) => entry.to === place.path)?.label ?? place.screen);
		return {
			id: `command:${command.name}`,
			kind: "command",
			label: `/${command.name}`,
			detail: screen === null ? command.description : t("search.configuredIn", { screen }),
			to: place?.path ?? `${commandList}?q=${encodeURIComponent(command.name)}`,
			icon: Terminal,
			terms: [command.description, ...command.aliases, ...command.subcommands.map((sub) => sub.name)],
		};
	});

	return [...screens, ...servers, ...commandEntries];
}

/** Lower-cased with accents removed, so "parametres" finds "Paramètres". */
export function fold(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function words(text: string): string[] {
	return fold(text)
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word !== "");
}

/** Lower is better; null when a word of the query appears nowhere in the entry. */
export function scoreOf(entry: SearchEntry, query: string): number | null {
	const wanted = words(query);
	if (wanted.length === 0) return null;

	const label = fold(entry.label).replace(/^\//, "");
	const labelWords = words(entry.label);
	const otherWords = [entry.detail, ...entry.terms].flatMap(words);
	const phrase = wanted.join(" ");

	if (label === phrase) return 0;
	if (label.startsWith(phrase)) return 1;
	if (wanted.every((word) => labelWords.some((candidate) => candidate.startsWith(word)))) return 2;
	if (wanted.every((word) => [...labelWords, ...otherWords].some((candidate) => candidate.startsWith(word)))) return 3;
	if (label.includes(phrase)) return 4;
	return null;
}

const KIND_ORDER: Record<SearchKind, number> = { screen: 0, command: 1, server: 2 };

const RESULT_LIMIT = 8;

/** Best match first, then screens before commands before servers; an empty query offers the start of the list. */
export function searchFor(entries: readonly SearchEntry[], query: string, limit = RESULT_LIMIT): SearchEntry[] {
	if (query.trim() === "") return entries.filter((entry) => entry.kind !== "command").slice(0, limit);

	return entries
		.map((entry, index) => ({ entry, index, score: scoreOf(entry, query) }))
		.filter((ranked): ranked is { entry: SearchEntry; index: number; score: number } => ranked.score !== null)
		.sort((a, b) => a.score - b.score || KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || a.index - b.index)
		.slice(0, limit)
		.map((ranked) => ranked.entry);
}

/** The modifier this reader's keyboard calls it by. */
export function shortcutLabel(platform: string): string {
	return /Mac|iPhone|iPad/i.test(platform) ? "⌘K" : "Ctrl K";
}
