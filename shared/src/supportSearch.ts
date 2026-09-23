/** BM25 over the help articles, shared so the dashboard's typeahead and the bot's answers rank the same way. */

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
	lvl: ["level"],
	lvls: ["level"],
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
	tracks: ["music"],
	djs: ["dj"],
	timeout: ["mute"],
	coins: ["money"],
	coin: ["money"],
	cash: ["money"],
	currency: ["money"],
	mod: ["moderator"],
	mods: ["moderator"],
	pfp: ["avatar"],
	bal: ["balance"],
	lb: ["leaderboard"],
	color: ["colour"],
	authorize: ["authorise"],
	greeting: ["welcome"],
	greet: ["welcome"],
	emote: ["emoji"],
	emotes: ["emoji"],
	bday: ["birthday"],
};

/** Two-word phrases that mean one thing, joined before the split so both sides of a search agree on them. */
const PHRASES: [RegExp, string][] = [
	[/\bhow (?:do|does|can) (.+?) work\b/g, "$1 explainer"],
	[/\bwhat (?:can|does) (?:this|the|you|it)(?: bot)? do\b/g, "capabilities"],
	[/\bwho can\b/g, "permission"],
	[/\bdoes (?:it|the bot|that) say\b/g, "says"],
	[/\bturn(?:ing)? (?:it |this |the )?(\w+ )?(?:up|down)\b/g, "$1adjust"],
	[/\b(?:get|put|bring)(?:ting)? (?:the |this |your )?(?:bot|it) (?:in|into|on|onto|to)\b/g, "add bot"],
	[/\b(?:log|sign)(?:ging)? ?in\b/g, "login"],
	[/\b(?:log|sign)(?:ging)? ?out\b/g, "logout"],
	[/\b(?:turn|switch)(?:ing)? off\b/g, "disable"],
	[/\b(?:turn|switch)(?:ing)? on\b/g, "enable"],
	[/\bset(?:ting)? ?up\b/g, "setup"],
	[/\btim(?:e|ing) ?out\b/g, "timeout"],
	[/\bmissing permissions?\b/g, "missingpermission"],
];

/** Words whose stem would merge two features: the counting game is not a member count. */
const KEEP_WHOLE = new Set(["counting"]);

/** Suffixes off, then a doubled consonant and a final `e`, so "spamming", "banned" and "giving" meet their roots. */
export function stem(word: string): string {
	if (KEEP_WHOLE.has(word)) return word;
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

/** The words that carry meaning, before stemming: phrases joined, stop words, numbers and `ignore` dropped. */
export function wordsOf(text: string, ignore: readonly string[] = []): string[] {
	const phrased = PHRASES.reduce(
		(current, [pattern, replacement]) => current.replace(pattern, replacement),
		text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, ""),
	);

	return phrased
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 1 && !/^\d+$/.test(word) && !STOP_WORDS.has(word) && !ignore.includes(word));
}

export function tokenise(text: string, ignore: readonly string[] = []): string[] {
	return wordsOf(text, ignore).map(stem);
}

/** Optimal string alignment distance, giving up once it is certain to pass `max`. */
export function editDistance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;

	let before: number[] = [];
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

	for (let i = 1; i <= a.length; i += 1) {
		const current = [i];
		let best = i;

		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let value = Math.min(
				(previous[j] ?? Infinity) + 1,
				(current[j - 1] ?? Infinity) + 1,
				(previous[j - 1] ?? Infinity) + cost,
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, (before[j - 2] ?? Infinity) + 1);
			}
			current[j] = value;
			best = Math.min(best, value);
		}

		if (best > max) return max + 1;
		before = previous;
		previous = current;
	}

	return previous[b.length] ?? max + 1;
}

export interface SearchableEntry {
	id: string;
	title: string;
	keywords: readonly string[];
	/** Ways a reader might ask for this article, weighted like its title. */
	questions: readonly string[];
	body?: string;
	kind: "article" | "command";
}

export interface SearchHit<T> {
	entry: T;
	score: number;
	/** How much of the question's weight this entry matched, from 0 to 1. */
	coverage: number;
}

const FIELD_WEIGHTS = { title: 3, questions: 3, keywords: 2, body: 1 } as const;
const K1 = 1.2;
const B = 0.75;
/** A written article outranks a command's generated page when both fit equally well. */
const ARTICLE_BOOST = 1.3;
/** A pair of words in the order an article uses them is strong evidence, but no substitute for the words. */
const PAIR_WEIGHT = 0.6;
const CORRECTED_WEIGHT = 0.8;
/** A corrected word counts for less towards being on-topic, or every off-topic word near an article's becomes one. */
const CORRECTED_CREDIT = 0.5;
const COMPLETED_WEIGHT = 0.85;
const MAX_COMPLETIONS = 8;

interface Option {
	term: string;
	weight: number;
	/** How much of the word's importance a match earns towards coverage. */
	credit: number;
}

interface Slot {
	options: Option[];
	importance: number;
}

interface Indexed<T> {
	entry: T;
	counts: Map<string, number>;
	length: number;
}

function pairsOf(tokens: readonly string[]): string[] {
	return tokens.slice(1).map((token, index) => `${tokens[index] ?? ""}_${token}`);
}

export class SupportSearch<T extends SearchableEntry> {
	readonly #documents: Indexed<T>[];
	readonly #frequency = new Map<string, number>();
	/** Single words only, the most common first, which is the order completions are offered in. */
	readonly #vocabulary: string[];
	readonly #corrections = new Map<string, string | null>();
	readonly #averageLength: number;
	readonly #ignore: readonly string[];

	/** `ignore` is the bot's own name, which every question about it may use and no article can be told apart by. */
	constructor(entries: readonly T[], { ignore = [] as readonly string[] } = {}) {
		this.#ignore = ignore;
		this.#documents = entries.map((entry) => {
			const counts = new Map<string, number>();
			let length = 0;
			const add = (text: string, weight: number): void => {
				const tokens = tokenise(text, ignore);
				for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + weight);
				for (const pair of pairsOf(tokens)) counts.set(pair, (counts.get(pair) ?? 0) + weight);
				length += tokens.length * weight;
			};

			add(entry.title, FIELD_WEIGHTS.title);
			for (const question of entry.questions) add(question, FIELD_WEIGHTS.questions);
			add(entry.keywords.join(", "), FIELD_WEIGHTS.keywords);
			add(entry.body ?? "", FIELD_WEIGHTS.body);

			return { entry, counts, length };
		});

		for (const document of this.#documents) {
			for (const token of document.counts.keys()) this.#frequency.set(token, (this.#frequency.get(token) ?? 0) + 1);
		}

		this.#vocabulary = [...this.#frequency.entries()]
			.filter(([token]) => !token.includes("_"))
			.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
			.map(([token]) => token);

		const total = this.#documents.reduce((sum, document) => sum + document.length, 0);
		this.#averageLength = this.#documents.length === 0 ? 1 : total / this.#documents.length;
	}

	/** A word no article uses weighs the most, so a question made of them has almost nothing covered. */
	idf(token: string): number {
		const count = this.#documents.length;
		const holding = this.#frequency.get(token) ?? 0;

		return Math.log(1 + (count - holding + 0.5) / (holding + 0.5));
	}

	/** The word the articles use that a misspelt one was nearest to, or null when nothing is close enough. */
	correct(term: string): string | null {
		if (term.length < 4 || this.#frequency.has(term)) return this.#frequency.has(term) ? term : null;

		const cached = this.#corrections.get(term);
		if (cached !== undefined) return cached;

		const max = term.length >= 7 ? 2 : 1;
		let best: string | null = null;
		let bestDistance = max + 1;
		for (const candidate of this.#vocabulary) {
			const distance = editDistance(term, candidate, Math.min(max, bestDistance - 1));
			if (distance < bestDistance) {
				best = candidate;
				bestDistance = distance;
			}
		}

		this.#corrections.set(term, best);
		return best;
	}

	/**
	 * `partial` reads the last word as still being typed, so "tick" finds tickets; every other word is completed only
	 * by correcting a typo.
	 */
	search(question: string, { partial = false } = {}): SearchHit<T>[] {
		const words = wordsOf(question, this.#ignore);
		const typing = partial && !/[\s.?!]$/.test(question);
		const slots = words.map((word, index) => this.#slot(word, typing && index === words.length - 1));
		const weight = slots.reduce((sum, slot) => sum + slot.importance, 0);
		if (weight === 0) return [];

		const pairs = pairsOf(slots.map((slot) => slot.options[0]?.term ?? ""));

		return this.#documents
			.map((document) => {
				let score = 0;
				let matched = 0;

				for (const slot of slots) {
					let best = 0;
					let bestCredit = 0;
					for (const option of slot.options) {
						const value = option.weight * this.#bm25(document, option.term);
						if (value > best) {
							best = value;
							bestCredit = option.credit;
						}
					}
					score += best;
					if (best > 0) matched += slot.importance * bestCredit;
				}

				for (const pair of pairs) score += PAIR_WEIGHT * this.#bm25(document, pair);

				const boost = document.entry.kind === "article" ? ARTICLE_BOOST : 1;
				return { entry: document.entry, score: score * boost, coverage: Math.min(1, matched / weight) };
			})
			.filter((hit) => hit.score > 0)
			.sort((left, right) => right.score - left.score);
	}

	#slot(word: string, typing: boolean): Slot {
		const alternatives = [...new Set([word, ...(ALSO_MEANS[word] ?? [])].map(stem))];
		const [head = ""] = alternatives;
		const options: Option[] = alternatives
			.filter((term) => this.#frequency.has(term))
			.map((term) => ({ term, weight: 1, credit: 1 }));

		if (typing) {
			for (const term of this.#vocabulary) {
				if (options.length >= MAX_COMPLETIONS) break;
				const completes = term.length > head.length && term.startsWith(head);
				const shortened = head.length > term.length && term.length >= 4 && head.startsWith(term);
				if ((completes || shortened) && !options.some((option) => option.term === term)) {
					options.push({ term, weight: COMPLETED_WEIGHT, credit: COMPLETED_WEIGHT });
				}
			}
		}

		if (options.length === 0) {
			const corrected = this.correct(head);
			if (corrected !== null) options.push({ term: corrected, weight: CORRECTED_WEIGHT, credit: CORRECTED_CREDIT });
		}

		const importance =
			options.length === 0 ? this.idf(head) : Math.max(...options.map((option) => this.idf(option.term)));
		return { options, importance };
	}

	#bm25(document: Indexed<T>, term: string): number {
		const frequency = document.counts.get(term) ?? 0;
		if (frequency === 0) return 0;

		const norm = K1 * (1 - B + (B * document.length) / this.#averageLength);
		return (this.idf(term) * (frequency * (K1 + 1))) / (frequency + norm);
	}
}

/** Coverage is what turns away an off-topic question: most of its words appear in no article at all. */
export const CONFIDENT = { score: 1, coverage: 0.42 } as const;
export const RELATED = { score: 2, coverage: 0.25 } as const;
/** Looser than an answer, because a list of suggestions is for the reader to choose from. */
export const SUGGESTED = { score: 0.5, coverage: 0.3 } as const;

export function isConfident<T>(hit: SearchHit<T> | undefined): hit is SearchHit<T> {
	return hit !== undefined && hit.score >= CONFIDENT.score && hit.coverage >= CONFIDENT.coverage;
}

export function isRelated<T>(hit: SearchHit<T>): boolean {
	return hit.score >= RELATED.score && hit.coverage >= RELATED.coverage;
}

export function isSuggested<T>(hit: SearchHit<T>): boolean {
	return hit.score >= SUGGESTED.score && hit.coverage >= SUGGESTED.coverage;
}
