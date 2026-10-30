import {
	Check,
	Copy,
	ExternalLink,
	Info,
	Lightbulb,
	MessageSquareWarning,
	OctagonAlert,
	TriangleAlert,
} from "lucide-react";
import { Lexer, type Token, type Tokens } from "marked";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
	type Alert,
	alertOf,
	decodeEntities,
	destinationOf,
	inlineText,
	type LinkContext,
	Slugger,
	withoutMarkup,
} from "@/features/docs/markdown.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";
import { highlighted } from "@/lib/highlight";

/** Markdown to React elements by walking the lexer's tokens: HTML in a file is dropped, never passed to the page. */

export interface DocHeading {
	id: string;
	text: string;
	level: number;
}

export interface MarkdownSource {
	/** The file it came from, relative to the repository's root, which every relative link is read against. */
	file: string;
	markdown: string;
	/** A whole file's own `#` title, which the page's heading already says. */
	dropTitle?: boolean;
}

export interface PreparedDoc {
	blocks: { file: string; tokens: Token[] }[];
	headings: DocHeading[];
	ids: WeakMap<Token, string>;
}

const level = (depth: number): number => Math.min(6, Math.max(2, depth));

/** Lexed once, so the contents list and the rendered headings carry the same anchors. */
export function prepareDoc(sources: readonly MarkdownSource[]): PreparedDoc {
	const slugger = new Slugger();
	const ids = new WeakMap<Token, string>();
	const headings: DocHeading[] = [];

	const blocks = sources.map((source) => {
		const tokens = Lexer.lex(withoutMarkup(source.markdown), { gfm: true });
		const title = tokens.findIndex((token) => token.type === "heading");
		if (source.dropTitle === true && (tokens[title] as Tokens.Heading | undefined)?.depth === 1)
			tokens.splice(title, 1);

		for (const token of tokens) {
			if (token.type !== "heading") continue;
			const heading = token as Tokens.Heading;
			const text = decodeEntities(inlineText(heading.text));
			const id = slugger.slug(text);
			ids.set(token, id);
			headings.push({ id, text, level: level(heading.depth) });
		}

		return { file: source.file, tokens };
	});

	return { blocks, headings, ids };
}

interface Scope {
	link: LinkContext;
	ids: WeakMap<Token, string>;
}

export function Markdown({
	doc,
	context,
}: {
	doc: PreparedDoc;
	context: Omit<LinkContext, "file" | "anchors">;
}): React.JSX.Element {
	const anchors = new Set(doc.headings.map((heading) => heading.id));

	return (
		<div className="flex min-w-0 flex-col gap-4">
			{doc.blocks.map((block) => (
				<Blocks
					key={block.file}
					tokens={block.tokens}
					scope={{ link: { ...context, file: block.file, anchors }, ids: doc.ids }}
				/>
			))}
		</div>
	);
}

function Blocks({ tokens, scope }: { tokens: readonly Token[]; scope: Scope }): React.JSX.Element {
	return <>{tokens.map((token, index) => block(token, scope, index))}</>;
}

const HEADING = {
	2: "font-display scroll-mt-24 pt-6 text-2xl leading-tight font-bold tracking-tight",
	3: "font-display scroll-mt-24 pt-2 text-lg leading-tight font-bold tracking-tight",
	4: "scroll-mt-24 text-base font-semibold",
	5: "scroll-mt-24 text-sm font-semibold",
	6: "text-muted-foreground scroll-mt-24 text-sm font-semibold",
} as const;

function block(token: Token, scope: Scope, key: number): ReactNode {
	switch (token.type) {
		case "heading": {
			const heading = token as Tokens.Heading;
			const depth = level(heading.depth) as keyof typeof HEADING;
			const Tag = `h${String(depth)}` as "h2";
			return (
				<Tag key={key} id={scope.ids.get(token)} className={HEADING[depth]}>
					{inline(heading.tokens, scope)}
				</Tag>
			);
		}
		case "paragraph":
			return (
				<p key={key} className="leading-relaxed text-pretty">
					{inline((token as Tokens.Paragraph).tokens, scope)}
				</p>
			);
		case "text": {
			const text = token as Tokens.Text;
			return text.tokens === undefined ? (
				decodeEntities(text.text)
			) : (
				<span key={key}>{inline(text.tokens, scope)}</span>
			);
		}
		case "code": {
			const code = token as Tokens.Code;
			return <CodeBlock key={key} code={code.text} language={code.lang} />;
		}
		case "blockquote":
			return <Quote key={key} quote={token as Tokens.Blockquote} scope={scope} />;
		case "list":
			return <List key={key} list={token as Tokens.List} scope={scope} />;
		case "table":
			return <Table key={key} table={token as Tokens.Table} scope={scope} />;
		case "hr":
			return <hr key={key} className="border-border" />;
		default:
			// `html`, `space` and link definitions draw nothing.
			return null;
	}
}

const LINK = "text-accent underline decoration-1 underline-offset-2 hover:decoration-2";

function inline(tokens: readonly Token[] | undefined, scope: Scope): ReactNode {
	return (tokens ?? []).map((token, key) => {
		switch (token.type) {
			case "text": {
				const text = token as Tokens.Text;
				return text.tokens === undefined ? decodeEntities(text.text) : inline(text.tokens, scope);
			}
			case "escape":
				return (token as Tokens.Escape).text;
			case "codespan":
				return (
					<code key={key} className="bg-muted rounded-chip px-1 py-0.5 font-mono text-[0.85em]">
						{(token as Tokens.Codespan).text}
					</code>
				);
			case "strong":
				return <strong key={key}>{inline((token as Tokens.Strong).tokens, scope)}</strong>;
			case "em":
				return <em key={key}>{inline((token as Tokens.Em).tokens, scope)}</em>;
			case "del":
				return <del key={key}>{inline((token as Tokens.Del).tokens, scope)}</del>;
			case "br":
				return <br key={key} />;
			case "link":
				return <DocLink key={key} link={token as Tokens.Link} scope={scope} />;
			case "image":
				return <DocImage key={key} image={token as Tokens.Image} scope={scope} />;
			default:
				return null;
		}
	});
}

function DocLink({ link, scope }: { link: Tokens.Link; scope: Scope }): React.JSX.Element {
	const children = inline(link.tokens, scope);
	const to = destinationOf(link.href, scope.link);

	if (to.kind === "route") {
		return (
			<Link to={to.to} className={LINK}>
				{children}
			</Link>
		);
	}
	if (to.kind === "none") return <>{children}</>;

	return (
		<a
			href={to.kind === "anchor" ? `#${to.id}` : to.href}
			className={LINK}
			rel={to.kind === "external" ? "noreferrer" : undefined}
		>
			{children}
		</a>
	);
}

/**
 * The policy lets no outside picture in and the repository's own are not bundled, so a picture is its description,
 * linked to the file where there is one.
 */
function DocImage({ image, scope }: { image: Tokens.Image; scope: Scope }): React.JSX.Element {
	const label = decodeEntities(image.text);
	const chip = "bg-muted text-muted-foreground rounded-chip inline-flex items-center gap-1 px-1.5 py-0.5 text-xs";

	if (/^https?:/i.test(image.href)) return <span className={chip}>{label}</span>;

	const to = destinationOf(image.href, scope.link);
	const href =
		to.kind === "route" ? `${scope.link.repository}/blob/HEAD/${to.to.replace(/^\/source-code\//, "")}` : null;
	return href === null ? (
		<span className={chip}>{label}</span>
	) : (
		<a href={href} className={cn(chip, "hover:text-foreground")} rel="noreferrer">
			<ExternalLink size={12} aria-hidden="true" />
			{label}
		</a>
	);
}

function CodeBlock({ code, language }: { code: string; language: string | undefined }): React.JSX.Element {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);

	return (
		<div className="relative min-w-0">
			<pre className="code-tokens bg-card border-border rounded-field overflow-x-auto border p-4 pr-12 font-mono text-[0.8125rem] leading-relaxed">
				<code>{highlighted(code, language)}</code>
			</pre>
			<button
				type="button"
				aria-label={copied ? t("docs.copied") : t("docs.copy")}
				onClick={() => {
					// Absent on a page served over plain HTTP from another machine, whatever the types say.
					if (!("clipboard" in navigator)) return;
					void navigator.clipboard.writeText(code).then(() => {
						setCopied(true);
					});
				}}
				className={cn(
					"text-muted-foreground hover:text-foreground hover:bg-muted rounded-chip absolute top-2 right-2",
					"flex size-8 items-center justify-center transition-colors duration-150",
					"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
				)}
			>
				{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
			</button>
		</div>
	);
}

const ALERT_LOOK: Record<Alert, { label: TranslationKey; icon: typeof Info; tint: string }> = {
	note: { label: "docs.alerts.note", icon: Info, tint: "text-accent border-accent" },
	tip: { label: "docs.alerts.tip", icon: Lightbulb, tint: "text-success border-success" },
	important: {
		label: "docs.alerts.important",
		icon: MessageSquareWarning,
		tint: "text-feature-community border-feature-community",
	},
	warning: { label: "docs.alerts.warning", icon: TriangleAlert, tint: "text-warning border-warning" },
	caution: { label: "docs.alerts.caution", icon: OctagonAlert, tint: "text-destructive-text border-destructive-text" },
};

function Quote({ quote, scope }: { quote: Tokens.Blockquote; scope: Scope }): React.JSX.Element {
	const { t } = useTranslation();
	const alert = alertOf(quote.text);

	if (alert === null) {
		return (
			<blockquote className="border-border text-muted-foreground flex flex-col gap-3 border-l-2 pl-4">
				<Blocks tokens={quote.tokens} scope={scope} />
			</blockquote>
		);
	}

	const look = ALERT_LOOK[alert.kind];
	const Icon = look.icon;
	return (
		<aside className={cn("bg-card rounded-field flex flex-col gap-2 border-l-2 px-4 py-3", look.tint)}>
			<p className="flex items-center gap-2 text-sm font-semibold">
				<Icon size={16} aria-hidden="true" />
				{t(look.label)}
			</p>
			<div className="text-foreground flex flex-col gap-3 text-sm">
				<Blocks tokens={Lexer.lex(alert.body, { gfm: true })} scope={scope} />
			</div>
		</aside>
	);
}

function List({ list, scope }: { list: Tokens.List; scope: Scope }): React.JSX.Element {
	const { t } = useTranslation();
	const items = list.items.map((item, index) => (
		<li key={index} className={cn("flex-col gap-2 pl-1", item.task ? "flex list-none" : "")}>
			{item.task ? (
				<span className="flex items-start gap-2">
					<span aria-hidden="true">{item.checked === true ? "☑" : "☐"}</span>
					<span className="sr-only">{item.checked === true ? t("docs.taskDone") : t("docs.taskOpen")}</span>
					<span>
						<Blocks tokens={item.tokens.filter((token) => token.type !== "checkbox")} scope={scope} />
					</span>
				</span>
			) : (
				<Blocks tokens={item.tokens} scope={scope} />
			)}
		</li>
	));

	return list.ordered ? (
		<ol
			start={typeof list.start === "number" ? list.start : undefined}
			className="flex list-decimal flex-col gap-1 pl-6"
		>
			{items}
		</ol>
	) : (
		<ul className="flex list-disc flex-col gap-1 pl-6">{items}</ul>
	);
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

function Table({ table, scope }: { table: Tokens.Table; scope: Scope }): React.JSX.Element {
	const cell = (align: Tokens.TableCell["align"]): string =>
		cn("border-border border-b px-3 py-2 align-top", align === null ? "text-left" : ALIGN[align]);

	return (
		<div className="border-border rounded-field min-w-0 overflow-x-auto border">
			<table className="w-full border-collapse text-sm">
				<thead className="bg-muted/50">
					<tr>
						{table.header.map((head, index) => (
							<th key={index} scope="col" className={cn(cell(head.align), "font-semibold")}>
								{inline(head.tokens, scope)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{table.rows.map((row, index) => (
						<tr key={index} className="last:[&>td]:border-b-0">
							{row.map((data, column) => (
								<td key={column} className={cell(data.align)}>
									{inline(data.tokens, scope)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
