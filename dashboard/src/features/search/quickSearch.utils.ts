import { type ChannelSummary, type CommandSummary, type ManageableGuild } from "@testify/shared";
import { type TFunction } from "i18next";
import { Columns3, FileText, Hash, type LucideIcon, Palette, ShieldQuestion, Terminal, Volume2 } from "lucide-react";
import { allNavItems, type NavAudience, navigationFor } from "@/config/navigation";
import { channelPath, channelTree } from "@/features/channels/channelMap.utils";
import { configurableAt } from "@/features/commands/commands.utils";

export type SearchKind = "screen" | "channel" | "command" | "server";

export interface SearchEntry {
	id: string;
	kind: SearchKind;
	label: string;
	detail: string;
	to: string;
	icon: LucideIcon | null;
	guild?: ManageableGuild;
	terms: string[];
}

const EXTRA_PAGES = [
	{ to: "/guilds/compare", labelKey: "nav.compare", hintKey: "nav.compareHint", icon: Columns3 },
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
	channels = [],
}: NavAudience & {
	t: TFunction;
	guilds: readonly ManageableGuild[];
	commands: readonly CommandSummary[];
	channels?: readonly ChannelSummary[];
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

	const channelEntries =
		guild === undefined
			? []
			: channelTree(channels)
					.flatMap((group) => group.channels)
					.map<SearchEntry>((channel) => ({
						id: `channel:${channel.id}`,
						kind: "channel",
						label: channel.kind === "voice" ? channel.name : `#${channel.name}`,
						detail: t("search.channel"),
						to: channelPath(guild.id, channel.id),
						icon: channel.kind === "voice" ? Volume2 : Hash,
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

	return [...screens, ...channelEntries, ...servers, ...commandEntries];
}

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

const KIND_ORDER: Record<SearchKind, number> = { screen: 0, channel: 1, command: 2, server: 3 };

const RESULT_LIMIT = 8;

export function searchFor(entries: readonly SearchEntry[], query: string, limit = RESULT_LIMIT): SearchEntry[] {
	if (query.trim() === "") return entries.filter((entry) => entry.kind !== "command").slice(0, limit);

	return entries
		.map((entry, index) => ({ entry, index, score: scoreOf(entry, query) }))
		.filter((ranked): ranked is { entry: SearchEntry; index: number; score: number } => ranked.score !== null)
		.sort((a, b) => a.score - b.score || KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || a.index - b.index)
		.slice(0, limit)
		.map((ranked) => ranked.entry);
}

export function shortcutLabel(platform: string): string {
	return /Mac|iPhone|iPad/i.test(platform) ? "⌘K" : "Ctrl K";
}
