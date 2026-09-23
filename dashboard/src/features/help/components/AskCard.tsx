import { type SupportArticle, type SupportArticleLink, SUPPORT_LIMITS } from "@testify/shared";
import { MessageCircleQuestion } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { describe } from "@/app/ErrorState";
import { Field, FIELD, LABEL, Warning } from "@/components/form";
import { Button, Card, CARD_HEADING, Skeleton } from "@/components/primitives";
import { ArticleBody } from "@/features/help/components/ArticleBody";
import { useAskSupport, useSupportArticle, useSupportIndex } from "@/features/help/useSupport";

/** Questions are matched to a written help article; nothing on this card is generated. */
export function AskCard({ name }: { name: string }): React.JSX.Element {
	const { t } = useTranslation();
	const inputId = useId();
	const [question, setQuestion] = useState("");
	const [opened, setOpened] = useState<string | null>(null);

	const index = useSupportIndex();
	const ask = useAskSupport();
	const article = useSupportArticle(opened);

	const trimmed = question.trim();
	const reply = ask.data;
	const related = reply?.related ?? [];
	const suggested = reply === undefined && opened === null ? (index.data?.suggested ?? []) : [];

	function submit(event: FormEvent): void {
		event.preventDefault();
		if (trimmed.length < SUPPORT_LIMITS.questionMin || ask.isPending) return;

		setOpened(null);
		ask.mutate(trimmed);
	}

	return (
		<Card focal className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<MessageCircleQuestion size={18} aria-hidden="true" className="text-accent shrink-0" />
					<h2 className={CARD_HEADING}>{t("help.askTitle")}</h2>
				</div>
				<p className="text-muted-foreground text-sm">{t("help.askBody", { name })}</p>
			</div>

			<form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<Field label={t("help.askLabel")} htmlFor={inputId} className="flex-1">
					<input
						id={inputId}
						type="text"
						className={FIELD}
						value={question}
						maxLength={SUPPORT_LIMITS.questionMax}
						autoComplete="off"
						enterKeyHint="send"
						placeholder={t("help.askPlaceholder")}
						onChange={(event) => setQuestion(event.target.value)}
					/>
				</Field>
				<Button type="submit" disabled={trimmed.length < SUPPORT_LIMITS.questionMin || ask.isPending}>
					{ask.isPending ? t("help.asking") : t("help.ask")}
				</Button>
			</form>

			{suggested.length > 0 && <Links label={t("help.askSuggested")} links={suggested} onOpen={setOpened} />}

			<div aria-live="polite" className="flex flex-col gap-4">
				{ask.isError && <Warning>{describe(ask.error, t).body}</Warning>}

				{opened !== null ? (
					<Opened query={article} />
				) : (
					reply !== undefined &&
					(reply.answer === null ? (
						<p className="text-muted-foreground text-sm">{t("help.askNoAnswer", { name })}</p>
					) : (
						<Article article={reply.answer} />
					))
				)}

				{related.length > 0 && <Links label={t("help.askRelated")} links={related} onOpen={setOpened} />}
			</div>
		</Card>
	);
}

function Opened({ query }: { query: ReturnType<typeof useSupportArticle> }): React.JSX.Element {
	const { t } = useTranslation();

	if (query.isError) return <Warning>{describe(query.error, t).body}</Warning>;
	if (query.data === undefined) return <Skeleton className="h-24 w-full" />;

	return <Article article={query.data} />;
}

function Article({ article }: { article: SupportArticle }): React.JSX.Element {
	const headingId = useId();

	return (
		<article aria-labelledby={headingId} className="border-border flex flex-col gap-3 border-t pt-4">
			<h3 id={headingId} className="text-base font-semibold">
				{article.title}
			</h3>
			<ArticleBody body={article.body} />
		</article>
	);
}

function Links({
	label,
	links,
	onOpen,
}: {
	label: string;
	links: SupportArticleLink[];
	onOpen: (id: string) => void;
}): React.JSX.Element {
	const labelId = useId();

	return (
		<div className="flex flex-col gap-2">
			<span id={labelId} className={LABEL}>
				{label}
			</span>
			<ul aria-labelledby={labelId} className="flex flex-wrap gap-2">
				{links.map((link) => (
					<li key={link.id} className="min-w-0">
						<Button variant="secondary" className="max-w-full text-left" onClick={() => onOpen(link.id)}>
							{link.title}
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}
