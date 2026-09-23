import { type SupportEntry } from "@lib/support/support.types";

/** BM25 over the help articles: finds the best one for a question, and knows when none of them is about it. */

const STOP_WORDS = new Set(
	(
		"a about after again all am an and any are as at be been being but by can could did do does doing done for from " +
		"get gets got had has have having he her here hers him his how i if in into is it its just me might my no not of " +
		"off on once only or other our out over please she should so some such than that the their them then there these " +
		"they this those through to too under until up us very was we were what when where which while who whom why will " +
		"with would you your yours yourself im ive dont doesnt cant cannot want need way thing things tell know let make " +
		"also still yet much many really help anything something someone somebody everyone anyone people isnt arent " +
		"wasnt werent didnt wont wouldnt couldnt shouldnt havent hasnt says said saying"
	).split(" "),
);

/** Words a reader uses for something the articles call by another name. */
const ALSO_MEANS: Record<string, string[]> = {
	leveling: ["levelling"],
	levels: ["level"],
	xp: ["level"],
	exp: ["xp"],
	invite: ["add"],
	install: ["add"],
	website: ["dashboard"],
	site: ["dashboard"],
	web: ["dashboard"],
	perms: ["permission"],
	perm: ["permission"],
	cmd: ["command"],
	cmds: ["command"],
	song: ["music"],
	songs: ["music"],
	track: ["music"],
	timeout: ["mute"],
	colour: ["color"],
	authorize: ["authorise"],
	greeting: ["welcome"],
};

/** Two-word phrases that mean one thing, joined before the split so both sides of a search agree on them. */
const PHRASES: [RegExp, string][] = [
	[/\bhow (?:do|does|can) (.+?) work\b/g, "$1"],
	[/\bwhat (?:can|does) (?:this|the|you|it)(?: bot)? do\b/g, "capabilities"],
	[/\bwho can\b/g, "permission"],
	[/\b(?:get|put|bring)(?:ting)? (?:the |this |your )?(?:bot|it) (?:in|into|on|onto|to)\b/g, "add bot"],
	[/\b(?:log|sign)(?:ging)? ?in\b/g, "login"],
	[/\b(?:log|sign)(?:ging)? ?out\b/g, "logout"],
	[/\b(?:turn|switch)(?:ing)? off\b/g, "disable"],
	[/\b(?:turn|switch)(?:ing)? on\b/g, "enable"],
	[/\bset(?:ting)? ?up\b/g, "setup"],
	[/\btim(?:e|ing) ?out\b/g, "timeout"],
	[/\bmissing permissions?\b/g, "missingpermission"],
];

/** Suffixes off, then a doubled consonant and a final `e`, so "spamming", "banned" and "giving" meet their roots. */
function stem(word: string): string {
	let root = word;

	if (root.length >= 3 && root.endsWith("s") && !root.endsWith("ss")) root = root.slice(0, -1);
	if (root.length > 4 && root.endsWith("ie")) root = `${root.slice(0, -2)}y`;

	const suffix = ["ing", "ed"].find((ending) => root.length > ending.length + 2 && root.endsWith(ending));
	if (suffix !== undefined) {
		root = root.slice(0, -suffix.length);
		if (/([bcfgjklmnpqrtvwxz])\1$/.test(root)) root = root.slice(0, -1);
	}

	if (root.length > 3 && root.endsWith("e")) root = root.slice(0, -1);
	return root;
}

export function tokenise(text: string, { expand = false, ignore = [] as readonly string[] } = {}): string[] {
	const phrased = PHRASES.reduce(
		(current, [pattern, replacement]) => current.replace(pattern, replacement),
		text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, ""),
	);
	const words = phrased
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 1 && !/^\d+$/.test(word) && !STOP_WORDS.has(word) && !ignore.includes(word));

	const expanded = expand ? words.flatMap((word) => [word, ...(ALSO_MEANS[word] ?? [])]) : words;
	return expanded.map(stem);
}

const FIELD_WEIGHTS = { title: 3, keywords: 2, body: 1 } as const;
const K1 = 1.2;
const B = 0.75;
/** A written article outranks a command's generated page when both fit equally well. */
const ARTICLE_BOOST = 1.3;

export interface SearchHit {
	entry: SupportEntry;
	score: number;
	/** How much of the question's weight this entry matched, from 0 to 1. */
	coverage: number;
}

interface Indexed {
	entry: SupportEntry;
	counts: Map<string, number>;
	length: number;
}

export class SupportSearch {
	readonly #documents: Indexed[];
	readonly #frequency = new Map<string, number>();
	readonly #averageLength: number;

	readonly #ignore: readonly string[];

	/** `ignore` is the bot's own name, which every question about it may use and no article can be told apart by. */
	constructor(entries: readonly SupportEntry[], { ignore = [] as readonly string[] } = {}) {
		this.#ignore = ignore;
		this.#documents = entries.map((entry) => {
			const counts = new Map<string, number>();
			const add = (text: string, weight: number): void => {
				for (const token of tokenise(text, { ignore })) counts.set(token, (counts.get(token) ?? 0) + weight);
			};

			add(entry.title, FIELD_WEIGHTS.title);
			add(entry.keywords.join(" "), FIELD_WEIGHTS.keywords);
			add(entry.body, FIELD_WEIGHTS.body);

			return { entry, counts, length: [...counts.values()].reduce((sum, count) => sum + count, 0) };
		});

		for (const document of this.#documents) {
			for (const token of document.counts.keys()) this.#frequency.set(token, (this.#frequency.get(token) ?? 0) + 1);
		}

		const total = this.#documents.reduce((sum, document) => sum + document.length, 0);
		this.#averageLength = this.#documents.length === 0 ? 1 : total / this.#documents.length;
	}

	/** A word no article uses weighs the most, so a question made of them has almost nothing covered. */
	idf(token: string): number {
		const count = this.#documents.length;
		const holding = this.#frequency.get(token) ?? 0;

		return Math.log(1 + (count - holding + 0.5) / (holding + 0.5));
	}

	search(question: string): SearchHit[] {
		const terms = [...new Set(tokenise(question, { expand: true, ignore: this.#ignore }))];
		const weight = terms.reduce((sum, term) => sum + this.idf(term), 0);
		if (weight === 0) return [];

		return this.#documents
			.map((document) => {
				let score = 0;
				let matched = 0;

				for (const term of terms) {
					const frequency = document.counts.get(term) ?? 0;
					if (frequency === 0) continue;

					const idf = this.idf(term);
					const norm = K1 * (1 - B + (B * document.length) / this.#averageLength);
					score += (idf * (frequency * (K1 + 1))) / (frequency + norm);
					matched += idf;
				}

				const boost = document.entry.kind === "article" ? ARTICLE_BOOST : 1;
				return { entry: document.entry, score: score * boost, coverage: matched / weight };
			})
			.filter((hit) => hit.score > 0)
			.sort((left, right) => right.score - left.score);
	}
}

/** Coverage is what turns away an off-topic question: most of its words appear in no article at all. */
export const CONFIDENT = { score: 1, coverage: 0.45 } as const;
export const RELATED = { score: 2, coverage: 0.25 } as const;

export function isConfident(hit: SearchHit | undefined): hit is SearchHit {
	return hit !== undefined && hit.score >= CONFIDENT.score && hit.coverage >= CONFIDENT.coverage;
}

export function isRelated(hit: SearchHit): boolean {
	return hit.score >= RELATED.score && hit.coverage >= RELATED.coverage;
}
