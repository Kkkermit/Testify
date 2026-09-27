import { useTranslation } from "react-i18next";
import { BackLink, Card, CARD_HEADING, DataList, PageHeader, PublicPage } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { type LegalDocument, type LegalSection, sectionId } from "@/features/legal/legal.content";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/datetime";

const PROSE = "text-muted-foreground text-sm leading-relaxed";

/** Both documents are public — read before signing in — which is why these routes sit outside `RequireAuth`. */
export function LegalPage({ document }: { document: LegalDocument }): React.JSX.Element {
	const { t, i18n } = useTranslation();
	usePageTitle(t(document.title));

	return (
		<PublicPage>
			<BackLink to="/guilds">{t("legal.backToDashboard")}</BackLink>

			<div className="flex flex-col gap-2">
				<PageHeader title={t(document.title)} subtitle={t(document.summary)} />
				<p className="text-muted-foreground text-xs">{t("legal.lastUpdated", { date: shortDate(document.updated) })}</p>
				{/* A translated licence is a convenience, never the agreement — say which text wins before it is read. */}
				{i18n.resolvedLanguage !== "en" && <p className="text-muted-foreground text-xs">{t("legal.englishGoverns")}</p>}
			</div>

			<Card padding="none" focal>
				<h2 className={cn(CARD_HEADING, "px-6 pt-6 pb-2")}>{t("legal.glance")}</h2>
				<DataList rows={document.glance.map((row) => ({ label: t(row.label), value: t(row.value) }))} />
			</Card>

			<Card className="flex flex-col gap-6">
				<nav aria-labelledby="legal-contents" className="flex flex-col gap-3">
					<h2 id="legal-contents" className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
						{t("legal.contents")}
					</h2>
					<ol className="gap-x-6 sm:columns-2">
						{document.sections.map((section, index) => (
							<li key={section.heading} className="break-inside-avoid">
								<a
									href={`#${sectionId(section)}`}
									className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 text-sm")}
								>
									<span className="tabular-nums">{index + 1}.</span>
									{t(section.heading)}
								</a>
							</li>
						))}
					</ol>
				</nav>

				<ol className="divide-border flex flex-col divide-y">
					{document.sections.map((section, index) => (
						<Section key={section.heading} section={section} number={index + 1} />
					))}
				</ol>
			</Card>
		</PublicPage>
	);
}

function Section({ section, number }: { section: LegalSection; number: number }): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<li id={sectionId(section)} className="flex scroll-mt-6 flex-col gap-3 py-6 first:pt-0 last:pb-0">
			<h2 className={CARD_HEADING}>
				<span className="text-muted-foreground tabular-nums">{number}.</span> {t(section.heading)}
			</h2>
			{section.paragraphs.map((paragraph) => (
				<p key={paragraph} className={PROSE}>
					{t(paragraph)}
				</p>
			))}
			{section.list !== undefined && (
				<ul className="text-muted-foreground flex list-disc flex-col gap-2 pl-5 text-sm">
					{section.list.map((item) => (
						<li key={item}>{t(item)}</li>
					))}
				</ul>
			)}
			{section.after?.map((paragraph) => (
				<p key={paragraph} className={PROSE}>
					{t(paragraph)}
				</p>
			))}
		</li>
	);
}
