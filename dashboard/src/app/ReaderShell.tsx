import { AppShell } from "@/app/AppShell";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { SiteShell } from "@/features/site/SiteShell";
import { useSite } from "@/features/site/useSite";

/** A page that belongs to the reader rather than an account: inside the dashboard when signed in, the website when not. */
export function ReaderShell(): React.JSX.Element {
	const site = useSite();
	const dashboard = site.data?.dashboard === true;
	// A host with no dashboard would only refuse, so it is never asked who is signed in.
	const me = useMe({ enabled: dashboard });

	if (site.isPending || (dashboard && me.isPending)) {
		return (
			<div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return dashboard && me.data !== null && me.data !== undefined ? <AppShell /> : <SiteShell column />;
}
