import { type SupportArticleLink, type SupportReply, SUPPORT_LIMITS } from "@testify/shared";
import { MessageCircleQuestion, Search } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { describe } from "@/app/ErrorState";
import { FIELD, LABEL, Warning } from "@/components/form";
import { Button, Card, CARD_HEADING, Disclosure, Eyebrow, Skeleton } from "@/components/primitives";
import { ArticleBody } from "@/features/help/components/ArticleBody";
import { TOPIC_LABELS } from "@/features/help/help.labels";
import { articlesByTopic, suggestionsFor } from "@/features/help/help.utils";
import { useAskSupport, useSupportArticle, useSupportSearch } from "@/features/help/useSupport";
import { cn } from "@/lib/cn";

const LINK = "text-accent hover:text-foreground text-sm underline-offset-2 hover:underline";

/** Questions are matched to a written help article; nothing on this card is generated. */
export function AskCard({ name }: { name: string }): React.JSX.Element {
	const { t } = useTranslation();
	const inputId = useId();
	const listId = useId();
	const [question, setQuestion] = useState("");
	const [focused, setFocused] = useState(false);
	const [active, setActive] = useState(-1);
	const [opened, setOpened] = useState<string | null>(null);

	const { entries, search } = useSupportSearch();
	const ask = useAskSupport();
	const article = useSupportArticle(opened);

	const trimmed = question.trim();
	const suggestions = trimmed === "" ? [] : suggestionsFor(search, entries, question);
	const expanded = focused && suggestions.length > 0;

	function open(id: string): void {
		setOpened(id);
		setFocused(false);
		setActive(-1);
	}

	function submit(event: FormEvent): void {
		event.preventDefault();
		if (trimmed.length < SUPPORT_LIMITS.questionMin || ask.isPending) return;

		setOpened(null);
		setFocused(false);
		ask.mutate(trimmed);
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (suggestions.length === 0) return;
			event.preventDefault();
			setFocused(true);
			const last = suggestions.length - 1;
			// Moving past either end returns to the text box, the way a native list of suggestions behaves.
			setActive((current) =>
				event.key === "ArrowDown" ? (current >= last ? -1 : current + 1) : current <= -1 ? last : current - 1,
			);
			return;
		}

		const chosen = suggestions[active];
		if (event.key === "Enter" && expanded && chosen !== undefined) {
			event.preventDefault();
			open(chosen.id);
			return;
		}

		if (event.key === "Escape" && expanded) {
			event.preventDefault();
			setFocused(false);
			setActive(-1);
		}
	}

	const shown: SupportReply | undefined = opened === null ? ask.data : article.data;
	const failure = opened === null ? (ask.isError ? ask.error : null) : article.isError ? article.error : null;
	const loading = opened !== null && article.isPending;

	return (
		<Card focal className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<MessageCircleQuestion size={18} aria-hidden="true" className="text-accent shrink-0" />
					<h2 className={CARD_HEADING}>{t("help.askTitle")}</h2>
				</div>
				<p className="text-muted-foreground text-sm">{t("help.askBody", { name })}</p>
			</div>

			<form onSubmit={submit} className="flex items-end gap-2">
				<div className="relative flex min-w-0 flex-1 flex-col gap-2">
					<label htmlFor={inputId} className={LABEL}>
						{t("help.askLabel")}
					</label>
					<div className="relative">
						<Search
							size={16}
							aria-hidden="true"
							className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
						/>
						<input
							id={inputId}
							type="text"
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={expanded}
							aria-controls={listId}
							aria-activedescendant={expanded && active >= 0 ? `${listId}-${String(active)}` : undefined}
							className={cn(FIELD, "pl-9")}
							value={question}
							maxLength={SUPPORT_LIMITS.questionMax}
							autoComplete="off"
							enterKeyHint="search"
							placeholder={t("help.askPlaceholder")}
							onChange={(event) => {
								setQuestion(event.target.value);
								setFocused(true);
								setActive(-1);
							}}
							onFocus={() => setFocused(true)}
							onBlur={() => setFocused(false)}
							onKeyDown={onKeyDown}
						/>
					</div>

					<ul
						id={listId}
						role="listbox"
						aria-label={t("help.suggestions")}
						hidden={!expanded}
						className="bg-card border-border rounded-field absolute top-full right-0 left-0 z-20 mt-1 flex max-h-80 flex-col overflow-y-auto border py-1 shadow-lg"
					>
						{suggestions.map((entry, index) => (
							<li
								key={entry.id}
								id={`${listId}-${String(index)}`}
								role="option"
								aria-selected={index === active}
								// Keeps the input focused, so the click lands before the list closes on blur.
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => open(entry.id)}
								className={cn(
									"flex cursor-pointer flex-col gap-1 px-3 py-2 text-sm",
									index === active ? "bg-muted" : "hover:bg-muted/60",
								)}
							>
								<span className="font-medium">{entry.title}</span>
								<span className="text-muted-foreground text-xs">{t(TOPIC_LABELS[entry.topic])}</span>
							</li>
						))}
					</ul>
				</div>

				<Button type="submit" disabled={trimmed.length < SUPPORT_LIMITS.questionMin || ask.isPending}>
					{ask.isPending ? t("help.asking") : t("help.ask")}
				</Button>
			</form>

			<p aria-live="polite" className="sr-only">
				{expanded ? t("help.suggestionCount", { count: suggestions.length }) : ""}
			</p>

			{shown === undefined && !loading && failure === null && (
				<Links label={t("help.askSuggested")} links={suggestionsFor(search, entries, "")} onOpen={open} />
			)}

			<div aria-live="polite" className="flex flex-col gap-4">
				{failure !== null && <Warning>{describe(failure, t).body}</Warning>}
				{loading && <Skeleton className="h-24 w-full" />}

				{shown !== undefined &&
					(shown.answer === null ? (
						<p className="text-muted-foreground border-border border-t pt-4 text-sm">
							{t("help.askNoAnswer", { name })}
						</p>
					) : (
						<Article article={shown.answer} focus={opened !== null} />
					))}

				{shown !== undefined && shown.related.length > 0 && (
					<Links label={t("help.askRelated")} links={shown.related} onOpen={open} />
				)}
			</div>

			<Browse onOpen={open} />
		</Card>
	);
}

/** `focus` moves to the heading when an article is opened by a button, so a reader lands on what they chose. */
function Article({
	article,
	focus,
}: {
	article: NonNullable<SupportReply["answer"]>;
	focus: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const headingId = useId();
	const heading = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		if (focus) heading.current?.focus();
	}, [focus, article.id]);

	return (
		<article aria-labelledby={headingId} className="border-border flex flex-col gap-3 border-t pt-4">
			<div className="flex flex-col gap-1">
				<Eyebrow>{t(TOPIC_LABELS[article.topic])}</Eyebrow>
				<h3
					id={headingId}
					ref={heading}
					tabIndex={-1}
					className="font-display text-lg font-bold tracking-tight outline-none"
				>
					{article.title}
				</h3>
			</div>
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
}): React.JSX.Element | null {
	const labelId = useId();
	if (links.length === 0) return null;

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

function Browse({ onOpen }: { onOpen: (id: string) => void }): React.JSX.Element | null {
	const { t } = useTranslation();
	const { entries } = useSupportSearch();
	const groups = articlesByTopic(entries);
	if (groups.length === 0) return null;

	return (
		<Disclosure label={t("help.browseTitle")} defaultOpen={false} className="border-border border-t pt-3">
			<div className="flex flex-col gap-4">
				{groups.map((group) => (
					<section key={group.topic} className="flex flex-col gap-2">
						<h3 className="text-sm font-semibold">{t(TOPIC_LABELS[group.topic])}</h3>
						<ul className="grid gap-1 sm:grid-cols-2">
							{group.articles.map((entry) => (
								<li key={entry.id}>
									<button type="button" className={cn(LINK, "min-h-6 text-left")} onClick={() => onOpen(entry.id)}>
										{entry.title}
									</button>
								</li>
							))}
						</ul>
					</section>
				))}
				<Link to="/commands" className={LINK}>
					{t("help.browseCommandPages")}
				</Link>
			</div>
		</Disclosure>
	);
}
