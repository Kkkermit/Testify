import { ExternalLink, Info, Lightbulb, MessageSquareWarning, OctagonAlert, TriangleAlert } from "lucide-react";
import { Lexer, type Token, type Tokens } from "marked";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CodeBlock } from "@/features/docs/components/CodeBlock";
import { type Alert, alertOf, decodeEntities, destinationOf, type LinkContext } from "@/features/docs/markdown.utils";
import { headingLevel, markedToken, type PreparedDoc } from "@/features/docs/markdownDoc.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

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

function block(raw: Token, scope: Scope, key: number): ReactNode {
	const token = markedToken(raw);
	switch (token.type) {
		case "heading": {
			const depth = headingLevel(token.depth);
			const Tag = `h${depth}` as const;
			return (
				<Tag key={key} id={scope.ids.get(raw)} className={HEADING[depth]}>
					{inline(token.tokens, scope)}
				</Tag>
			);
		}
		case "paragraph":
			return (
				<p key={key} className="leading-relaxed text-pretty">
					{inline(token.tokens, scope)}
				</p>
			);
		case "text":
			return token.tokens === undefined ? (
				decodeEntities(token.text)
			) : (
				<span key={key}>{inline(token.tokens, scope)}</span>
			);
		case "code":
			return <CodeBlock key={key} code={token.text} language={token.lang} />;
		case "blockquote":
			return <Quote key={key} quote={token} scope={scope} />;
		case "list":
			return <List key={key} list={token} scope={scope} />;
		case "table":
			return <Table key={key} table={token} scope={scope} />;
		case "hr":
			return <hr key={key} className="border-border" />;
		// Raw HTML is never drawn, and the rest only appear inside a paragraph, a list or a table.
		case "html":
		case "space":
		case "def":
		case "checkbox":
		case "list_item":
		case "br":
		case "codespan":
		case "del":
		case "em":
		case "escape":
		case "image":
		case "link":
		case "strong":
			return null;
	}
}

const LINK = "text-accent underline decoration-1 underline-offset-2 hover:decoration-2";

function inline(tokens: readonly Token[] | undefined, scope: Scope): ReactNode {
	return (tokens ?? []).map((raw, key) => {
		const token = markedToken(raw);
		switch (token.type) {
			case "text":
				return token.tokens === undefined ? decodeEntities(token.text) : inline(token.tokens, scope);
			case "escape":
				return token.text;
			case "codespan":
				return (
					<code key={key} className="bg-muted rounded-chip px-1 py-0.5 font-mono text-[0.85em]">
						{token.text}
					</code>
				);
			case "strong":
				return <strong key={key}>{inline(token.tokens, scope)}</strong>;
			case "em":
				return <em key={key}>{inline(token.tokens, scope)}</em>;
			case "del":
				return <del key={key}>{inline(token.tokens, scope)}</del>;
			case "br":
				return <br key={key} />;
			case "link":
				return <DocLink key={key} link={token} scope={scope} />;
			case "image":
				return <DocImage key={key} image={token} scope={scope} />;
			// Raw HTML is never drawn, and a block never sits inside a line of text.
			case "html":
			case "blockquote":
			case "checkbox":
			case "code":
			case "def":
			case "heading":
			case "hr":
			case "list_item":
			case "list":
			case "paragraph":
			case "space":
			case "table":
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

/** The CSP lets no outside picture in, so a picture is drawn as its description and a link. */
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

const ALERT_LOOK: Record<Alert, { label: TranslationKey; icon: typeof Info; tint: string }> = {
	note: { label: "docs.alerts.note", icon: Info, tint: "text-accent border-accent" },
	tip: { label: "docs.alerts.tip", icon: Lightbulb, tint: "text-success border-success" },
	important: {
		label: "docs.alerts.important",
		icon: MessageSquareWarning,
		tint: "text-hue-pink border-hue-pink",
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
