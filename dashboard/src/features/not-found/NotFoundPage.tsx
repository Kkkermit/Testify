import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { Card, EmptyState, PageHeader } from "@/components/primitives";
import { BackLink, PublicPage } from "@/components/primitives/PublicPage";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/** Carries no landmark of its own: the catch-all wraps it in `<main>`, and inside the shell it uses the shell's. */
export function NotFoundContent(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("notFound.title"));
	const { pathname } = useLocation();

	return (
		<>
			<BackLink to="/guilds">{t("notFound.backToDashboard")}</BackLink>

			<PageHeader title={t("notFound.title")} subtitle={t("notFound.subtitle")} />

			<Card>
				<EmptyState
					icon={<Compass size={28} />}
					title={t("notFound.emptyTitle")}
					body={t("notFound.emptyBody")}
					action={
						<Link to="/guilds" className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}>
							{t("notFound.toServers")}
						</Link>
					}
				/>
			</Card>

			{/* The address is the one thing that makes a bug report actionable, so it is printed rather than guessed at. */}
			<p className="text-muted-foreground font-mono text-xs break-all">{pathname}</p>
		</>
	);
}

/**
 * Outside `RequireAuth`, so a mistyped address says what is wrong rather than asking a signed-out reader to sign in.
 */
export function NotFoundPage(): React.JSX.Element {
	return (
		<PublicPage>
			<NotFoundContent />
		</PublicPage>
	);
}
