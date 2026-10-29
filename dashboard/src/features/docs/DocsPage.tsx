import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useParams } from "react-router";
import { Card, CARD_HEADING, Eyebrow, PAGE_TITLE, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { useBot } from "@/features/auth/useBot";
import { ConfigurationTable } from "@/features/docs/components/ConfigurationTable";
import { Guides } from "@/features/docs/components/Guides";
import { Markdown, type MarkdownSource, prepareDoc } from "@/features/docs/components/Markdown";
import {
	type DocPage,
	docPage,
	DOC_GROUPS,
	DOC_PAGES,
	GROUP_LABELS,
	LOADERS,
	type MarkdownPage,
	PAGES_BY_FILE,
	PAGES_BY_SECTION,
} from "@/features/docs/docs.pages";
import { sectionsOf } from "@/features/docs/markdown.utils";
import { SiteError } from "@/features/site/components/SiteError";
import { useSite } from "@/features/site/useSite";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { keys } from "@/lib/queries";

/** `/docs` lists every page; `/docs/:slug` shows one, and `/docs/guides/:articleId` one help article. */
export function DocsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const { slug, articleId } = useParams();
	const page = articleId === undefined ? docPage(slug) : docPage("guides");
	usePageTitle(
		page === undefined ? t("docs.title") : t(page.titleKey),
		page === undefined ? undefined : t("docs.title"),
	);

	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
			<DocsNav current={page?.slug} />

			<div className="min-w-0">
				{slug === undefined && articleId === undefined ? (
					<DocsIndex />
				) : page === undefined ? (
					<SiteError title={t("docs.missingTitle")} body={t("docs.missingBody")} />
				) : (
					<DocView page={page} articleId={articleId} />
				)}
			</div>
		</div>
	);
}

function DocsNav({ current }: { current: string | undefined }): React.JSX.Element {
	const { t } = useTranslation();

	const groups = DOC_GROUPS.map((group) => (
		<div key={group} className="flex flex-col gap-1">
			<Eyebrow as="h2">{t(GROUP_LABELS[group])}</Eyebrow>
			<ul className="flex flex-col">
				{DOC_PAGES.filter((page) => page.group === group).map((page) => (
					<li key={page.slug}>
						<NavLink
							to={`/docs/${page.slug}`}
							aria-current={page.slug === current ? "page" : undefined}
							className={cn(
								INLINE_TARGET,
								"rounded-chip w-full px-2 py-1 text-sm transition-colors duration-150",
								page.slug === current
									? "bg-muted text-foreground font-medium"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t(page.titleKey)}
						</NavLink>
					</li>
				))}
			</ul>
		</div>
	));

	return (
		<nav aria-label={t("docs.nav")} className="lg:sticky lg:top-6 lg:self-start">
			{/* A phone gets the list folded away, or the page would open on two screens of links. */}
			<details className="border-border rounded-card border lg:hidden">
				<summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium">
					{t("docs.contents")}
				</summary>
				<div className="flex flex-col gap-4 px-4 pb-4">{groups}</div>
			</details>
			<div className="hidden flex-col gap-6 lg:flex">{groups}</div>
		</nav>
	);
}

function DocsIndex(): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className={PAGE_TITLE}>{t("docs.title")}</h1>
				<p className="text-muted-foreground max-w-2xl">{t("docs.subtitle")}</p>
			</div>

			{DOC_GROUPS.map((group) => (
				<section key={group} aria-labelledby={`docs-${group}`} className="flex flex-col gap-3">
					<h2 id={`docs-${group}`} className={CARD_HEADING}>
						{t(GROUP_LABELS[group])}
					</h2>
					<ul className="grid items-start gap-3 sm:grid-cols-2 [&>li]:min-w-0">
						{DOC_PAGES.filter((page) => page.group === group).map((page) => (
							<li key={page.slug}>
								<Link
									to={`/docs/${page.slug}`}
									className={cn(
										"bg-card border-border surface-edge rounded-card group flex h-full flex-col gap-1 border px-6 py-4",
										"hover:border-accent/60 transition-colors duration-150",
										"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
									)}
								>
									<span className="flex items-center gap-2 font-medium">
										{t(page.titleKey)}
										<ArrowRight
											size={14}
											aria-hidden="true"
											className="text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
										/>
									</span>
									<span className="text-muted-foreground text-sm">{t(page.summaryKey)}</span>
								</Link>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function DocView({ page, articleId }: { page: DocPage; articleId: string | undefined }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<article className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<Eyebrow>{t(GROUP_LABELS[page.group])}</Eyebrow>
				<h1 className={PAGE_TITLE}>{t(page.titleKey)}</h1>
				<p className="text-muted-foreground">{t(page.summaryKey)}</p>
			</header>

			{page.kind === "markdown" && <MarkdownDoc page={page} />}
			{page.kind === "configuration" && <ConfigurationTable />}
			{page.kind === "guides" && <Guides articleId={articleId ?? null} />}
		</article>
	);
}

/** One section of a file drops its own heading, which would only repeat the page's; a whole file drops its title. */
async function sourcesOf(page: MarkdownPage): Promise<MarkdownSource[]> {
	return Promise.all(
		page.sources.map(async (source) => {
			const markdown = await LOADERS[source.file]();
			const sections = source.sections;
			if (sections === undefined) return { file: source.file, markdown, dropTitle: true };

			const found = sectionsOf(markdown, sections).filter((section): section is string => section !== null);
			return { file: source.file, markdown: found.join("\n\n"), dropTitle: sections.length === 1 };
		}),
	);
}

function MarkdownDoc({ page }: { page: MarkdownPage }): React.JSX.Element {
	const { t } = useTranslation();
	const site = useSite();
	const bot = useBot();
	const repository = site.data?.repository ?? bot.data?.repositoryUrl ?? "";
	const sources = useQuery({ queryKey: keys.docs(page.slug), queryFn: () => sourcesOf(page), staleTime: Infinity });
	const doc = useMemo(() => (sources.data === undefined ? null : prepareDoc(sources.data)), [sources.data]);

	if (sources.isError) {
		return (
			<SiteError
				title={t("docs.failedTitle")}
				body={t("docs.failedBody")}
				onRetry={() => {
					void sources.refetch();
				}}
			/>
		);
	}

	if (doc === null) {
		return (
			<div className="flex flex-col gap-3">
				<Skeleton className="h-5 w-3/4" />
				<Skeleton className="h-5 w-2/3" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	const files = [...new Set(page.sources.map((source) => source.file))];

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_12rem]">
			<div className="flex min-w-0 flex-col gap-6">
				<Markdown doc={doc} context={{ repository, pagesByFile: PAGES_BY_FILE, pagesBySection: PAGES_BY_SECTION }} />
				<Card padding="compact" className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
					{t("docs.from")}
					{files.map((file) => (
						<Link
							key={file}
							to={`/source-code/${file}`}
							className={cn(INLINE_TARGET, "text-accent gap-1 font-mono text-xs")}
						>
							{file}
						</Link>
					))}
					{repository !== "" && (
						<a
							href={`${repository}/blob/HEAD/${files[0] ?? ""}`}
							rel="noreferrer"
							className={cn(INLINE_TARGET, "hover:text-foreground ml-auto gap-1")}
						>
							<ExternalLink size={13} aria-hidden="true" />
							{t("docs.onGithub")}
						</a>
					)}
				</Card>
			</div>

			{doc.headings.length > 2 && (
				<nav
					aria-label={t("docs.onThisPage")}
					className="hidden xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-2 xl:self-start"
				>
					<Eyebrow as="h2">{t("docs.onThisPage")}</Eyebrow>
					<ul className="flex flex-col gap-1 text-sm">
						{doc.headings
							.filter((heading) => heading.level <= 3)
							.map((heading) => (
								<li key={heading.id} className={heading.level === 3 ? "pl-3" : undefined}>
									<a href={`#${heading.id}`} className="text-muted-foreground hover:text-foreground line-clamp-2">
										{heading.text}
									</a>
								</li>
							))}
					</ul>
				</nav>
			)}
		</div>
	);
}
