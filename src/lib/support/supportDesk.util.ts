import { theme } from "@config/theme";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type Logger } from "@core/logger";
import { type SupportContext, type SupportEntry, type SupportPicker } from "@lib/support/support.types";
import { commandEntries, fillPlaceholders, linkEntries, loadArticles } from "@lib/support/supportArticles.util";
import { findLeak, secretsOf } from "@lib/support/supportGuard.util";
import { createClaudePicker } from "@lib/support/supportModel.util";
import {
	isConfident,
	isRelated,
	isSuggested,
	type SearchHit,
	type SupportArticle,
	type SupportArticleLink,
	type SupportCatalogueEntry,
	SUPPORT_LIMITS,
	type SupportReply,
	SupportSearch,
} from "@testify/shared";

/** Answers a question with a vetted article or with nothing, and checks every answer for secrets on the way out. */

const MODEL_CALLS_PER_HOUR = 120;
const CACHE_MS = 10 * 60_000;
const CACHE_SIZE = 500;
const SUGGESTIONS = 10;

/** A fixed hour, so a flood of questions costs the owner at most this many model calls before search takes over. */
export class HourlyBudget {
	#windowStart = 0;
	#used = 0;

	constructor(
		readonly limit: number,
		readonly windowMs = 3_600_000,
	) {}

	take(now: number): boolean {
		if (now - this.#windowStart >= this.windowMs) {
			this.#windowStart = now;
			this.#used = 0;
		}
		if (this.#used >= this.limit) return false;

		this.#used += 1;
		return true;
	}
}

export interface DeskOptions {
	entries: readonly SupportEntry[];
	picker: SupportPicker | null;
	secrets: readonly string[];
	logger: Logger;
	ignore?: readonly string[];
	modelCallsPerHour?: number;
	now?: () => number;
}

export class SupportDesk {
	readonly #entries: Map<string, SupportEntry>;
	readonly #search: SupportSearch<SupportEntry>;
	readonly #picker: SupportPicker | null;
	readonly #secrets: readonly string[];
	readonly #logger: Logger;
	readonly #budget: HourlyBudget;
	readonly #now: () => number;
	/** Keyed by the question, holding only which article was chosen; nothing here names who asked. */
	readonly #cache = new Map<string, { at: number; id: string | null }>();

	constructor(options: DeskOptions) {
		this.#entries = new Map(options.entries.map((entry) => [entry.id, entry]));
		this.#search = new SupportSearch(options.entries, { ignore: options.ignore ?? [] });
		this.#picker = options.picker;
		this.#secrets = options.secrets;
		this.#logger = options.logger;
		this.#budget = new HourlyBudget(options.modelCallsPerHour ?? MODEL_CALLS_PER_HOUR);
		this.#now = options.now ?? Date.now;
	}

	async ask(question: string, context: SupportContext): Promise<SupportReply> {
		const hits = this.#search.search(question);
		const chosen = await this.#choose(question, hits);

		return {
			answer: chosen === null ? null : this.#render(chosen, context),
			related: this.#related(chosen, hits, context),
		};
	}

	article(id: string, context: SupportContext): SupportArticle | null {
		const entry = this.#entries.get(id);
		return entry === undefined ? null : this.#render(entry, context);
	}

	/** Opening an article offers the ones it links to first, then whatever its own title finds. */
	relatedTo(id: string, context: SupportContext): SupportArticleLink[] {
		const entry = this.#entries.get(id);
		return entry === undefined ? [] : this.#related(entry, this.#search.search(entry.title), context);
	}

	/** What to offer while somebody is still typing; with nothing typed yet, the articles most people start from. */
	suggest(partial: string, context: SupportContext, limit = SUGGESTIONS): SupportArticleLink[] {
		const entries =
			partial.trim() === ""
				? [...this.#entries.values()].filter((entry) => entry.featured)
				: this.#search
						.search(partial, { partial: true })
						.filter(isSuggested)
						.map((hit) => hit.entry);

		return entries.flatMap((entry) => this.#link(entry, context)).slice(0, limit);
	}

	/** Everything but the bodies, which is what the dashboard's typeahead searches in the browser. */
	catalogue(context: SupportContext): SupportCatalogueEntry[] {
		return [...this.#entries.values()].flatMap((entry) => {
			const [link] = this.#link(entry, context);
			if (link === undefined) return [];

			const keywords = [...entry.keywords];
			const questions = entry.questions.map((question) => fillPlaceholders(question, context));
			if (findLeak([...keywords, ...questions].join("\n"), this.#secrets) !== null) return [];

			return [{ ...link, kind: entry.kind, featured: entry.featured, keywords, questions }];
		});
	}

	async #choose(question: string, hits: SearchHit<SupportEntry>[]): Promise<SupportEntry | null> {
		const now = this.#now();
		const key = question.toLowerCase().replace(/\s+/g, " ").trim();
		const cached = this.#cache.get(key);
		if (cached !== undefined && now - cached.at < CACHE_MS) {
			return cached.id === null ? null : (this.#entries.get(cached.id) ?? null);
		}

		let chosen: SupportEntry | null | undefined;
		if (this.#picker !== null && this.#budget.take(now)) {
			try {
				const pick = await this.#picker.pick(question);
				chosen = pick.kind === "none" ? null : this.#entries.get(pick.id);
			} catch (error) {
				// The question itself is never logged: it is somebody's words, and the log is shown in the owner console.
				this.#logger.debug(
					{ err: toError(error) },
					"[SUPPORT] The model could not pick an article, so search answered.",
				);
			}
		}

		// Undefined, not null: the model saying nothing fits is an answer, and search must not overrule it.
		if (chosen === undefined) {
			const [top] = hits;
			chosen = isConfident(top) ? top.entry : null;
		}

		if (this.#cache.size >= CACHE_SIZE) this.#cache.delete(this.#cache.keys().next().value ?? "");
		this.#cache.set(key, { at: now, id: chosen?.id ?? null });

		return chosen;
	}

	#related(
		chosen: SupportEntry | null,
		hits: SearchHit<SupportEntry>[],
		context: SupportContext,
	): SupportArticleLink[] {
		const linked = (chosen?.links ?? []).flatMap((id) => {
			const entry = this.#entries.get(id);
			return entry === undefined ? [] : [entry];
		});
		const found = hits.filter((hit) => isRelated(hit)).map((hit) => hit.entry);
		const seen = new Set(chosen === null ? [] : [chosen.id]);

		return [...linked, ...found]
			.filter((entry) => {
				if (seen.has(entry.id)) return false;
				seen.add(entry.id);
				return true;
			})
			.flatMap((entry) => this.#link(entry, context))
			.slice(0, SUPPORT_LIMITS.related);
	}

	#render(entry: SupportEntry, context: SupportContext): SupportArticle | null {
		const article = {
			id: entry.id,
			title: fillPlaceholders(entry.title, context),
			topic: entry.topic,
			body: fillPlaceholders(entry.body, context),
		};

		const leak = findLeak(`${article.title}\n${article.body}`, this.#secrets);
		if (leak === null) return article;

		this.#logger.warn(
			{ article: entry.id, rule: leak },
			"[SUPPORT] A help article was withheld because it looked like it held a secret. Edit it.",
		);
		return null;
	}

	#link(entry: SupportEntry, context: SupportContext): SupportArticleLink[] {
		const article = this.#render(entry, context);
		return article === null ? [] : [{ id: article.id, title: article.title, topic: article.topic }];
	}
}

/** Every entry the desk may answer with, minus any that could leak before a single question is asked. */
export function buildEntries(client: TestifyClient, secrets: readonly string[]): SupportEntry[] {
	const articles = loadArticles().flatMap((result) => {
		if (result.ok) return [result.article];

		client.logger.warn(
			{ file: result.file, reason: result.reason },
			"[SUPPORT] A help article was skipped. Fix its frontmatter.",
		);
		return [];
	});

	const { entries, problems } = linkEntries(articles, commandEntries(client.commands.values()));
	for (const problem of problems) {
		client.logger.warn(
			problem,
			"[SUPPORT] A help article links to something that does not exist. Fix its frontmatter.",
		);
	}

	return entries.filter((entry) => {
		const leak = findLeak(
			[
				entry.title,
				...entry.keywords,
				...entry.questions,
				fillPlaceholders(entry.body, { bot: "", prefix: "", repository: "" }),
			].join("\n"),
			secrets,
		);
		if (leak !== null) {
			client.logger.warn(
				{ article: entry.id, rule: leak },
				"[SUPPORT] A help article was left out because it looked like it held a secret. Edit it.",
			);
		}
		return leak === null;
	});
}

export function supportContext(prefix: string): SupportContext {
	return { bot: botName(), prefix, repository: theme.repository };
}

let desk: SupportDesk | null = null;

/** Built on first use, after login, so the bot's own name is known; the articles and commands never change at runtime. */
export function supportDesk(client: TestifyClient): SupportDesk {
	if (desk !== null) return desk;

	const secrets = secretsOf(client.env);
	const entries = buildEntries(client, secrets);
	const bot = botName();
	const apiKey = client.env.SUPPORT_AI_API_KEY;

	desk = new SupportDesk({
		entries,
		picker:
			apiKey === undefined ? null : createClaudePicker({ apiKey, model: client.env.SUPPORT_AI_MODEL, entries, bot }),
		secrets,
		logger: client.logger,
		ignore: bot.toLowerCase().split(/[^\p{L}\p{N}]+/u),
	});

	return desk;
}

export function resetSupportDesk(): void {
	desk = null;
}
