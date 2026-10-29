import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CARD_HEADING, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { ArticleBody } from "@/features/help/components/ArticleBody";
import { TOPIC_LABELS } from "@/features/help/help.labels";
import { articlesByTopic } from "@/features/help/help.utils";
import { useSupportArticle, useSupportSearch } from "@/features/help/useSupport";
import { SiteError } from "@/features/site/components/SiteError";
import { cn } from "@/lib/cn";

/** The help articles `/ask` answers with, filled in by the bot for its own prefix and limits, and readable signed out. */
export function Guides({ articleId }: { articleId: string | null }): React.JSX.Element {
	return articleId === null ? <GuideList /> : <Guide id={articleId} />;
}

function GuideList(): React.JSX.Element {
	const { t } = useTranslation();
	const { entries } = useSupportSearch();
	const groups = articlesByTopic(entries);

	if (entries.length === 0) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="grid items-start gap-4 md:grid-cols-2 [&>*]:min-w-0">
			{groups.map((group) => (
				<Card key={group.topic} className="flex flex-col gap-3">
					<h2 className={CARD_HEADING}>{t(TOPIC_LABELS[group.topic])}</h2>
					<ul className="flex flex-col gap-1">
						{group.articles.map((article) => (
							<li key={article.id}>
								<Link
									to={`/docs/guides/${article.id}`}
									className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground text-sm")}
								>
									{article.title}
								</Link>
							</li>
						))}
					</ul>
				</Card>
			))}
		</div>
	);
}

function Guide({ id }: { id: string }): React.JSX.Element {
	const { t } = useTranslation();
	const reply = useSupportArticle(id);

	const back = (
		<Link to="/docs/guides" className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 text-sm")}>
			<ArrowLeft size={15} aria-hidden="true" />
			{t("docs.guides.back")}
		</Link>
	);

	if (reply.isError) {
		return (
			<div className="flex flex-col gap-4">
				{back}
				<SiteError title={t("docs.guides.missingTitle")} body={t("docs.guides.missingBody")} />
			</div>
		);
	}

	const article = reply.data?.answer;
	if (article === undefined) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="flex flex-col gap-4">
			{back}
			{article === null ? (
				<SiteError title={t("docs.guides.missingTitle")} body={t("docs.guides.missingBody")} />
			) : (
				<Card className="flex flex-col gap-4">
					<h2 className="font-display text-xl font-bold tracking-tight">{article.title}</h2>
					<ArticleBody body={article.body} />
					{(reply.data?.related.length ?? 0) > 0 && (
						<div className="border-border flex flex-col gap-2 border-t pt-4">
							<h3 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
								{t("docs.guides.related")}
							</h3>
							<ul className="flex flex-wrap gap-2">
								{reply.data?.related.map((link) => (
									<li key={link.id}>
										<Link
											to={`/docs/guides/${link.id}`}
											className="bg-muted hover:text-foreground text-muted-foreground rounded-chip inline-flex min-h-6 items-center px-2 text-sm"
										>
											{link.title}
										</Link>
									</li>
								))}
							</ul>
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
