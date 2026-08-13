import { ArrowLeft, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { Card, EmptyState, PageHeader } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/**
 * The same screen in two places, so it carries no landmark of its own: at the catch-all route it is wrapped in
 * `<main>` below, and inside the app shell it renders into the shell’s. Two `<main>` elements on one page is
 * invalid, and gives a screen reader two "main" landmarks to choose between.
 */
export function NotFoundContent(): React.JSX.Element {
	const { t } = useTranslation();
	usePageTitle(t("notFound.title"));
	const { pathname } = useLocation();

	return (
		<>
			<Link
				to="/guilds"
				className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 self-start text-sm")}
			>
				<ArrowLeft size={15} aria-hidden="true" />
				{t("notFound.backToDashboard")}
			</Link>

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
 * Outside `RequireAuth`, so a mistyped address says what is wrong rather than sending a signed-out reader to a
 * sign-in screen for a page that was never going to exist.
 */
export function NotFoundPage(): React.JSX.Element {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
			<NotFoundContent />
		</main>
	);
}
