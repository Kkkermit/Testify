import { type SearchableEntry, type SupportTopic } from "@testify/shared";

/** One thing the assistant can answer with: a written article, or a page generated from a command. */
export interface SupportEntry extends SearchableEntry {
	topic: SupportTopic;
	body: string;
	featured: boolean;
	/** Ids of the entries that belong beside this one: a guide's command pages, or a command's guides. */
	links: string[];
}

export type SupportPick = { kind: "article"; id: string } | { kind: "none" };

export interface SupportPicker {
	pick(question: string): Promise<SupportPick>;
}

/** The values an article's `{bot}`, `{prefix}` and `{repository}` placeholders stand for. */
export interface SupportContext {
	bot: string;
	prefix: string;
	repository: string;
}
