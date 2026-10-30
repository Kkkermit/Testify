/** The rules that turn the repository's own Markdown into the docs: which part of a file a page shows, and where each link goes. */

/** GitHub's anchor for a heading, so a link written for GitHub lands on the same heading here. */
export function headingSlug(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
		.replace(/ /g, "-");
}

/** Repeats take `-1`, `-2` and so on, as GitHub numbers them. */
export class Slugger {
	readonly #seen = new Map<string, number>();

	slug(text: string): string {
		const base = headingSlug(text);
		const count = this.#seen.get(base) ?? 0;
		this.#seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${String(count)}`;
	}
}

/** A heading's words without its emoji, its section number or its punctuation, which is how a page names the part it shows. */
export function headingName(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s.]/gu, " ")
		.replace(/^\s*\d+(?:\.\d+)*\.?\s+/, "")
		.replace(/\./g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** The same name read back out of an anchor, so a link to a section finds the page that shows it. */
export function anchorName(anchor: string): string {
	return headingName(anchor.replace(/-/g, " "));
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

interface Heading {
	line: number;
	depth: number;
	text: string;
}

function headingsOf(lines: readonly string[]): Heading[] {
	const found: Heading[] = [];
	let fence: string | null = null;

	lines.forEach((line, index) => {
		const opened = FENCE.exec(line)?.[1];
		if (opened !== undefined) {
			fence = fence === null ? opened : fence === opened ? null : fence;
			return;
		}
		if (fence !== null) return;

		const match = HEADING.exec(line);
		if (match?.[1] !== undefined && match[2] !== undefined) {
			found.push({ line: index, depth: match[1].length, text: match[2] });
		}
	});

	return found;
}

/** Each named heading with everything under it, in the order asked for; null for a name the file no longer has. */
export function sectionsOf(markdown: string, names: readonly string[]): (string | null)[] {
	const lines = markdown.split("\n");
	const headings = headingsOf(lines);

	return names.map((name) => {
		const at = headings.findIndex((heading) => headingName(heading.text) === headingName(name));
		const start = headings[at];
		if (start === undefined) return null;

		const end = headings.slice(at + 1).find((heading) => heading.depth <= start.depth)?.line ?? lines.length;
		return lines.slice(start.line, end).join("\n").trim();
	});
}

/** Every heading's anchor in a file, for knowing whether a link to one stays on this page. */
export function anchorsOf(markdown: string): string[] {
	const slugger = new Slugger();
	return headingsOf(markdown.split("\n")).map((heading) => slugger.slug(inlineText(heading.text)));
}

/** A heading's words without its Markdown, which is what GitHub builds the anchor from. */
export function inlineText(markdown: string): string {
	return markdown
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[`*_~]/g, "")
		.trim();
}

/**
 * GitHub's collapsible FAQ, `<details>` around a `<summary>`, as a heading and its answer: the renderer shows no HTML
 * at all, and the question is the part worth keeping.
 */
export function withoutMarkup(markdown: string): string {
	return markdown
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^\s*<summary>(?:<strong>)?([\s\S]*?)(?:<\/strong>)?<\/summary>\s*$/gm, "\n#### $1\n")
		.replace(/^\s*<\/?details>\s*$/gm, "");
}

/** Where a link in a document goes on this site. */
export type Destination =
	| { kind: "route"; to: string }
	| { kind: "external"; href: string }
	| { kind: "anchor"; id: string }
	| { kind: "none" };

/** The only schemes a docs link may leave by; any other, a script or `data:` one included, is not a link at all. */
const SAFE_SCHEME = /^(?:https?|mailto):/i;

export interface LinkContext {
	/** The file the link was written in, relative to the repository's root. */
	file: string;
	/** The anchors on the page being shown, so an in-page link stays in it. */
	anchors: ReadonlySet<string>;
	/** Pages that show a whole file, by the file's path. */
	pagesByFile: Readonly<Record<string, string>>;
	/** Pages that show one section, by the file's path and that section's name. */
	pagesBySection: Readonly<Record<string, string>>;
	repository: string;
}

/** `docs/a/../b.md` as `docs/b.md`; null for a path that climbs out of the repository. */
export function normalisePath(path: string): string | null {
	const parts: string[] = [];
	for (const part of path.split("/")) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			if (parts.length === 0) return null;
			parts.pop();
			continue;
		}
		parts.push(part);
	}
	return parts.join("/");
}

function directoryOf(file: string): string {
	return file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";
}

/** A docs page when one shows it, this site's source browser for any other file, and the web for everything else. */
export function destinationOf(href: string, context: LinkContext): Destination {
	if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return SAFE_SCHEME.test(href) ? { kind: "external", href } : { kind: "none" };

	const [rawPath = "", hash = ""] = href.split("#", 2);
	if (rawPath === "") {
		if (context.anchors.has(hash)) return { kind: "anchor", id: hash };
		return { kind: "external", href: `${context.repository}/blob/HEAD/${context.file}#${hash}` };
	}

	const path = normalisePath(`${directoryOf(context.file)}/${rawPath}`);
	if (path === null) return { kind: "external", href: `${context.repository}/blob/HEAD/${rawPath}` };

	const section = hash === "" ? undefined : context.pagesBySection[`${path}#${anchorName(hash)}`];
	if (section !== undefined) return { kind: "route", to: `/docs/${section}#${hash}` };

	const page = context.pagesByFile[path];
	if (page !== undefined) return { kind: "route", to: hash === "" ? `/docs/${page}` : `/docs/${page}#${hash}` };

	return { kind: "route", to: `/source-code/${path}` };
}

export interface EnvVariable {
	name: string;
	description: string;
	/** What the template fills in, which is blank for nearly all of them. */
	example: string;
	/** The template's own heading for the block it sits in. */
	group: string | null;
}

/** Every variable in a `.env` template with the comment written above it, in the template's own order and groups. */
export function variablesIn(template: string): EnvVariable[] {
	const variables: EnvVariable[] = [];
	let comment: string[] = [];
	let group: string | null = null;

	for (const line of template.split("\n")) {
		const heading = /^#\s*─+\s*(.+?)\s*─+\s*$/.exec(line);
		if (heading?.[1] !== undefined) {
			group = heading[1];
			comment = [];
			continue;
		}

		const setting = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
		if (setting?.[1] !== undefined) {
			variables.push({ name: setting[1], description: comment.join(" "), example: setting[2] ?? "", group });
			comment = [];
			continue;
		}

		if (line.startsWith("#")) comment.push(line.replace(/^#\s?/, "").trim());
		else comment = [];
	}

	return variables.map((variable) => ({ ...variable, description: variable.description.replace(/\s+/g, " ").trim() }));
}

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: "\u00a0",
	copy: "©",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	middot: "·",
	rarr: "→",
	larr: "←",
	times: "×",
};

/** The lexer leaves `&amp;` as written, and text is shown as text, so a reference is read back into its character. */
export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
		if (name.startsWith("#")) {
			const code = name[1] === "x" || name[1] === "X" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
			return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
		}
		return ENTITIES[name.toLowerCase()] ?? whole;
	});
}

export const ALERTS = ["note", "tip", "important", "warning", "caution"] as const;
export type Alert = (typeof ALERTS)[number];

/** GitHub's `> [!NOTE]`, and the text after the marker. */
export function alertOf(quote: string): { kind: Alert; body: string } | null {
	const match = /^\s*\[!(note|tip|important|warning|caution)\]\s*\n?/i.exec(quote);
	if (match?.[1] === undefined) return null;
	return { kind: match[1].toLowerCase() as Alert, body: quote.slice(match[0].length) };
}
