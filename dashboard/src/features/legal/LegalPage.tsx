import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Card, PageHeader } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { type LegalDocument } from "@/features/legal/legal.content";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/** Both documents are public — read before signing in — which is why these routes sit outside `RequireAuth`. */
export function LegalPage({ document }: { document: LegalDocument }): React.JSX.Element {
	usePageTitle(document.title);

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
			<Link
				to="/guilds"
				className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-1.5 self-start text-sm")}
			>
				<ArrowLeft size={15} aria-hidden="true" />
				Back to the dashboard
			</Link>

			<PageHeader title={document.title} subtitle={document.summary} />

			{document.sections.map((section) => (
				<Card key={section.heading} className="flex flex-col gap-3">
					<h2 className="font-display text-base font-bold tracking-tight">{section.heading}</h2>
					{section.paragraphs.map((paragraph) => (
						<p key={paragraph} className="text-muted-foreground text-sm leading-relaxed">
							{paragraph}
						</p>
					))}
					{section.list !== undefined && (
						<ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
							{section.list.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					)}
				</Card>
			))}
		</main>
	);
}
