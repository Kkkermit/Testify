import { ArrowLeft, Compass } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Card, EmptyState, PageHeader } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";

/**
 * Outside `RequireAuth`, so a mistyped address says what is wrong rather than sending a signed-out reader to a
 * sign-in screen for a page that was never going to exist.
 */
export function NotFoundPage(): React.JSX.Element {
	usePageTitle("Page not found");
	const { pathname } = useLocation();

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
			<Link
				to="/guilds"
				className={cn(INLINE_TARGET, "text-muted-foreground hover:text-foreground gap-2 self-start text-sm")}
			>
				<ArrowLeft size={15} aria-hidden="true" />
				Back to the dashboard
			</Link>

			<PageHeader title="Page not found" subtitle="That address does not match any screen in this dashboard." />

			<Card>
				<EmptyState
					icon={<Compass size={28} />}
					title="Nothing lives here"
					body="Check the address for a typo, or start again from your servers. If a link inside the dashboard brought you here, that is worth reporting."
					action={
						<Link to="/guilds" className={cn(INLINE_TARGET, "text-accent hover:text-foreground text-sm")}>
							Go to your servers
						</Link>
					}
				/>
			</Card>

			{/* The address is the one thing that makes a bug report actionable, so it is printed rather than guessed at. */}
			<p className="text-muted-foreground font-mono text-xs break-all">{pathname}</p>
		</main>
	);
}
