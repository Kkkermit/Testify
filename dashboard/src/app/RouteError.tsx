import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteError } from "react-router";
import { claimAutoReload, classifyRouteError, errorDetails, reloadPage, sessionStore } from "@/app/routeError.utils";
import { Button, Card, Disclosure, EmptyState, PageHeader, PublicPage, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { NotFoundContent } from "@/features/not-found/NotFoundPage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/** Only the development build defines it, so a production reader never sees a stack or a file path. */
const SHOW_DETAILS = typeof __DEV_ERRORS__ === "boolean" && __DEV_ERRORS__;

/** The router's `errorElement`: inside the shell it keeps the sidebar, outside it brings its own page. */
export function RouteError({ standalone = false }: { standalone?: boolean }): React.JSX.Element {
	const error = useRouteError();
	const failure = classifyRouteError(error);
	const [reloading, setReloading] = useState(failure === "stale");
	const decided = useRef(false);

	// A file that moved under an open tab is fixed by loading the new one, so the reader never has to see this.
	useEffect(() => {
		if (failure !== "stale" || decided.current) return;
		decided.current = true;
		if (claimAutoReload(sessionStore())) reloadPage();
		else setReloading(false);
	}, [failure]);

	const content = reloading ? (
		<Skeleton className="h-64 w-full" />
	) : failure === "notFound" ? (
		<NotFoundContent />
	) : (
		<Failure stale={failure === "stale"} details={SHOW_DETAILS ? errorDetails(error) : null} />
	);

	return standalone ? <PublicPage>{content}</PublicPage> : content;
}

function Failure({ stale, details }: { stale: boolean; details: string | null }): React.JSX.Element {
	const { t } = useTranslation();
	const title = stale ? t("routeError.staleTitle") : t("routeError.crashTitle");
	usePageTitle(title);

	return (
		<>
			<PageHeader title={title} />
			<Card>
				<EmptyState
					icon={stale ? <RefreshCw size={28} /> : <TriangleAlert size={28} />}
					title={stale ? t("routeError.staleHeading") : t("routeError.crashHeading")}
					body={stale ? t("routeError.staleBody") : t("routeError.crashBody")}
					action={
						<div className="mt-2 flex flex-wrap items-center justify-center gap-2">
							<Button onClick={reloadPage}>{t("routeError.reload")}</Button>
							<Link to="/guilds" className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground text-sm")}>
								{t("error.backToServers")}
							</Link>
						</div>
					}
				/>
			</Card>
			{details !== null && (
				<Disclosure label={t("routeError.details")} defaultOpen={false}>
					<pre className="bg-muted rounded-field overflow-x-auto p-4 font-mono text-xs whitespace-pre-wrap">
						{details}
					</pre>
				</Disclosure>
			)}
		</>
	);
}
