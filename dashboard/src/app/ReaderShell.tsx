import { AppShell } from "@/app/AppShell";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { SiteShell } from "@/features/site/SiteShell";
import { useSite } from "@/features/site/useSite";

export function ReaderShell(): React.JSX.Element {
	const site = useSite();
	const dashboard = site.data?.dashboard === true;
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
