import { type ArticleBlock, articleBlocks, type ArticleSpan } from "@testify/shared";
import { useMemo } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/cn";

const LINK = "text-accent hover:text-foreground underline underline-offset-2";

/** An article's Markdown subset drawn as elements, so nothing in it is ever parsed as HTML. */
export function ArticleBody({ body }: { body: string }): React.JSX.Element {
	const blocks = useMemo(() => articleBlocks(body), [body]);

	return (
		<div className="flex flex-col gap-3 text-sm">
			{blocks.map((block, index) => (
				<Block key={index} block={block} />
			))}
		</div>
	);
}

function Block({ block }: { block: ArticleBlock }): React.JSX.Element {
	switch (block.kind) {
		case "heading":
			return (
				<h4 className="font-semibold">
					<Spans spans={block.spans} />
				</h4>
			);
		case "paragraph":
			return (
				<p className="text-muted-foreground">
					<Spans spans={block.spans} />
				</p>
			);
		case "list": {
			const List = block.ordered ? "ol" : "ul";
			return (
				<List
					className={cn("text-muted-foreground flex flex-col gap-1 pl-5", block.ordered ? "list-decimal" : "list-disc")}
				>
					{block.items.map((spans, index) => (
						<li key={index}>
							<Spans spans={spans} />
						</li>
					))}
				</List>
			);
		}
	}
}

function Spans({ spans }: { spans: ArticleSpan[] }): React.JSX.Element {
	return (
		<>
			{spans.map((span, index) => (
				<Span key={index} span={span} />
			))}
		</>
	);
}

function Span({ span }: { span: ArticleSpan }): React.JSX.Element {
	switch (span.kind) {
		case "text":
			return <>{span.text}</>;
		case "strong":
			return <strong className="text-foreground font-semibold">{span.text}</strong>;
		case "code":
			return <code className="bg-muted text-foreground rounded-chip px-1 font-mono text-[0.8125rem]">{span.text}</code>;
		case "link":
			return span.external ? (
				<a href={span.href} target="_blank" rel="noreferrer" className={LINK}>
					{span.text}
				</a>
			) : (
				<Link to={span.href} className={LINK}>
					{span.text}
				</Link>
			);
	}
}
