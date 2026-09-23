import { z } from "zod";
import { plainText } from "./text";

/** The support assistant's contract: a question in, a vetted help article out, and a safe Markdown subset to draw it. */

export const SUPPORT_LIMITS = {
	questionMin: 3,
	questionMax: 300,
	related: 3,
	articleIdMax: 48,
	titleMax: 80,
	bodyMax: 2_000,
} as const;

export const SUPPORT_ARTICLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const supportQuestion = z
	.object({ question: plainText(SUPPORT_LIMITS.questionMin, SUPPORT_LIMITS.questionMax) })
	.strict();

export const supportArticleParams = z.object({
	articleId: z.string().max(SUPPORT_LIMITS.articleIdMax).regex(SUPPORT_ARTICLE_ID),
});

export interface SupportArticleLink {
	id: string;
	title: string;
}

export interface SupportArticle extends SupportArticleLink {
	/** The Markdown subset `articleBlocks` reads, which Discord also renders as written. */
	body: string;
}

export interface SupportReply {
	/** Null when nothing in the help articles answers the question, which is also the answer to anything off-topic. */
	answer: SupportArticle | null;
	related: SupportArticleLink[];
}

export interface SupportIndex {
	suggested: SupportArticleLink[];
}

/** Outside hosts an article may link to; any other link is drawn as its text. */
export const SUPPORT_LINK_HOSTS = ["discord.com", "support.discord.com", "discord.gg", "github.com"] as const;

const INTERNAL_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?(?:\?[a-z]+=[a-z0-9-]+)?$/;

export interface LinkTarget {
	href: string;
	external: boolean;
}

export function linkTarget(href: string): LinkTarget | null {
	if (INTERNAL_PATH.test(href)) return { href, external: false };

	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return null;
	}

	const allowed = (SUPPORT_LINK_HOSTS as readonly string[]).includes(url.hostname);
	if (url.protocol !== "https:" || !allowed || url.username !== "" || url.password !== "") return null;

	return { href: url.toString(), external: true };
}

export type ArticleSpan =
	| { kind: "text"; text: string }
	| { kind: "strong"; text: string }
	| { kind: "code"; text: string }
	| { kind: "link"; text: string; href: string; external: boolean };

export type ArticleBlock =
	| { kind: "paragraph"; spans: ArticleSpan[] }
	| { kind: "heading"; spans: ArticleSpan[] }
	| { kind: "list"; ordered: boolean; items: ArticleSpan[][] };

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function articleSpans(line: string): ArticleSpan[] {
	const spans: ArticleSpan[] = [];
	let cursor = 0;

	for (const match of line.matchAll(INLINE)) {
		const at = match.index;
		if (at > cursor) spans.push({ kind: "text", text: line.slice(cursor, at) });

		const [, strong, code, label, href] = match;
		if (strong !== undefined) spans.push({ kind: "strong", text: strong });
		else if (code !== undefined) spans.push({ kind: "code", text: code });
		else if (label !== undefined && href !== undefined) {
			const target = linkTarget(href);
			spans.push(target === null ? { kind: "text", text: label } : { kind: "link", text: label, ...target });
		}

		cursor = at + match[0].length;
	}

	if (cursor < line.length) spans.push({ kind: "text", text: line.slice(cursor) });
	return spans;
}

const BULLET = /^- /;
const NUMBERED = /^\d+\. /;

/** Headings, paragraphs and lists, separated by blank lines: everything an article is allowed to be. */
export function articleBlocks(markdown: string): ArticleBlock[] {
	return markdown
		.split(/\n\s*\n/)
		.map((chunk) =>
			chunk
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line !== ""),
		)
		.filter((lines) => lines.length > 0)
		.map((lines): ArticleBlock => {
			const [first = ""] = lines;

			if (lines.length === 1 && first.startsWith("### ")) {
				return { kind: "heading", spans: articleSpans(first.slice(4)) };
			}

			for (const [pattern, ordered] of [
				[BULLET, false],
				[NUMBERED, true],
			] as const) {
				if (lines.every((line) => pattern.test(line))) {
					return { kind: "list", ordered, items: lines.map((line) => articleSpans(line.replace(pattern, ""))) };
				}
			}

			return { kind: "paragraph", spans: articleSpans(lines.join(" ")) };
		});
}
