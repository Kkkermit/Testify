/** One thing the assistant can answer with: a written article, or a page generated from a command. */
export interface SupportEntry {
	id: string;
	title: string;
	keywords: string[];
	body: string;
	featured: boolean;
	kind: "article" | "command";
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
