import {
	isSuggested,
	type SupportCatalogueEntry,
	SUPPORT_TOPICS,
	type SupportSearch,
	type SupportTopic,
} from "@testify/shared";
import { type LucideIcon } from "lucide-react";
import { allNavItems, navigationFor, type NavGroup } from "@/config/navigation";
import { type TranslationKey } from "@/i18n";

/** One area of the dashboard, as the tour describes it. */
export interface HelpArea {
	labelKey: TranslationKey;
	hintKey: TranslationKey | undefined;
	icon: LucideIcon;
}

/** The tour reads the sidebar's registry; it has no server in scope, so this id is never read. */
const UNUSED_GUILD = { id: "0", name: "" };

export function helpAreas(isOwner: boolean): HelpArea[] {
	const groups: NavGroup[] = navigationFor({ guild: UNUSED_GUILD, isOwner });

	return allNavItems(groups).map((item) => ({
		labelKey: item.labelKey,
		hintKey: item.hintKey,
		icon: item.icon,
	}));
}

/** Suggestions for what has been typed so far; before anything is typed, the articles most people start from. */
export function suggestionsFor(
	search: SupportSearch<SupportCatalogueEntry> | null,
	entries: readonly SupportCatalogueEntry[],
	typed: string,
	limit = 8,
): SupportCatalogueEntry[] {
	if (typed.trim() === "") return entries.filter((entry) => entry.featured).slice(0, limit);
	if (search === null) return [];

	return search
		.search(typed, { partial: true })
		.filter(isSuggested)
		.slice(0, limit)
		.map((hit) => hit.entry);
}

export interface TopicGroup {
	topic: SupportTopic;
	articles: SupportCatalogueEntry[];
}

/** The written articles by topic, in reading order; command pages are left to the command list, which already has them all. */
export function articlesByTopic(entries: readonly SupportCatalogueEntry[]): TopicGroup[] {
	return SUPPORT_TOPICS.filter((topic) => topic !== "commands").flatMap((topic) => {
		const articles = entries
			.filter((entry) => entry.kind === "article" && entry.topic === topic)
			.sort((left, right) => left.title.localeCompare(right.title));

		return articles.length === 0 ? [] : [{ topic, articles }];
	});
}
