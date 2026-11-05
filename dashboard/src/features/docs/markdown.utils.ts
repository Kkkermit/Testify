export function headingSlug(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
		.replace(/ /g, "-");
}

export class Slugger {
	readonly #seen = new Map<string, number>();

	slug(text: string): string {
		const base = headingSlug(text);
		const count = this.#seen.get(base) ?? 0;
		this.#seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${String(count)}`;
	}
}

export function headingName(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s.]/gu, " ")
		.replace(/^\s*\d+(?:\.\d+)*\.?\s+/, "")
		.replace(/\./g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

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

export function anchorsOf(markdown: string): string[] {
	const slugger = new Slugger();
	return headingsOf(markdown.split("\n")).map((heading) => slugger.slug(inlineText(heading.text)));
}

export function inlineText(markdown: string): string {
	return markdown
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[`*_~]/g, "")
		.trim();
}

/** GitHub's `<details>` FAQ becomes a heading and its answer, because no HTML is rendered. */
export function withoutMarkup(markdown: string): string {
	return markdown
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^\s*<summary>(?:<strong>)?([\s\S]*?)(?:<\/strong>)?<\/summary>\s*$/gm, "\n#### $1\n")
		.replace(/^\s*<\/?details>\s*$/gm, "");
}

export type Destination =
	| { kind: "route"; to: string }
	| { kind: "external"; href: string }
	| { kind: "anchor"; id: string }
	| { kind: "none" };

/** The only schemes a docs link may leave by; any other, a script or `data:` one included, is not a link at all. */
const SAFE_SCHEME = /^(?:https?|mailto):/i;

export interface LinkContext {
	file: string;
	anchors: ReadonlySet<string>;
	pagesByFile: Readonly<Record<string, string>>;
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
	example: string;
	group: string | null;
}

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

export function alertOf(quote: string): { kind: Alert; body: string } | null {
	const match = /^\s*\[!(note|tip|important|warning|caution)\]\s*\n?/i.exec(quote);
	if (match?.[1] === undefined) return null;
	return { kind: match[1].toLowerCase() as Alert, body: quote.slice(match[0].length) };
}
