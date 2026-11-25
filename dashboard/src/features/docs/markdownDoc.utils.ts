import { Lexer, type MarkedToken, type Token } from "marked";
import { decodeEntities, inlineText, Slugger, withoutMarkup } from "@/features/docs/markdown.utils";

export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

interface DocHeading {
	id: string;
	text: string;
	level: HeadingLevel;
}

export interface MarkdownSource {
	file: string;
	markdown: string;
	dropTitle?: boolean;
}

export interface PreparedDoc {
	blocks: { file: string; tokens: Token[] }[];
	headings: DocHeading[];
	ids: WeakMap<Token, string>;
}

/** A page has its own `<h1>`, so a document's headings start at `<h2>`. */
export function headingLevel(depth: number): HeadingLevel {
	return depth <= 2 ? 2 : depth >= 6 ? 6 : (depth as HeadingLevel);
}

/** The lexer runs with no extensions, so every token it hands back is one of marked's own. */
export function markedToken(token: Token): MarkedToken {
	return token as MarkedToken;
}

/** Lexes each source and names every heading once, so two "Setup" sections in one page link to different places. */
export function prepareDoc(sources: readonly MarkdownSource[]): PreparedDoc {
	const slugger = new Slugger();
	const ids = new WeakMap<Token, string>();
	const headings: DocHeading[] = [];

	const blocks = sources.map((source) => {
		const tokens = Lexer.lex(withoutMarkup(source.markdown), { gfm: true });
		const title = tokens.findIndex((token) => token.type === "heading");
		const first = tokens[title];
		if (source.dropTitle === true && first !== undefined) {
			const heading = markedToken(first);
			if (heading.type === "heading" && heading.depth === 1) tokens.splice(title, 1);
		}

		for (const token of tokens) {
			const heading = markedToken(token);
			if (heading.type !== "heading") continue;
			const text = decodeEntities(inlineText(heading.text));
			const id = slugger.slug(text);
			ids.set(token, id);
			headings.push({ id, text, level: headingLevel(heading.depth) });
		}

		return { file: source.file, tokens };
	});

	return { blocks, headings, ids };
}
