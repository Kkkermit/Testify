import { Card, PageHeader } from "@/components/primitives";
import { BackLink, PublicPage } from "@/components/primitives/PublicPage";
import { CARD_HEADING } from "@/components/primitives/textStyles";
import { type LegalDocument } from "@/features/legal/legal.content";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Both documents are public — read before signing in — which is why these routes sit outside `RequireAuth`. */
export function LegalPage({ document }: { document: LegalDocument }): React.JSX.Element {
	usePageTitle(document.title);

	return (
		<PublicPage>
			<BackLink to="/guilds">Back to the dashboard</BackLink>

			<PageHeader title={document.title} subtitle={document.summary} />

			{document.sections.map((section) => (
				<Card key={section.heading} className="flex flex-col gap-3">
					<h2 className={CARD_HEADING}>{section.heading}</h2>
					{section.paragraphs.map((paragraph) => (
						<p key={paragraph} className="text-muted-foreground text-sm leading-relaxed">
							{paragraph}
						</p>
					))}
					{section.list !== undefined && (
						<ul className="text-muted-foreground flex list-disc flex-col gap-2 pl-5 text-sm">
							{section.list.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					)}
				</Card>
			))}
		</PublicPage>
	);
}
