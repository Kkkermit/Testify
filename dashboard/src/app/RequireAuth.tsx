import { Navigate, Outlet, useLocation } from "react-router";
import { Skeleton } from "@/components/primitives";
import { BlockedPage } from "@/features/account/BlockedPage";
import { useMe } from "@/features/auth/useMe";

/** Not access control: the API refuses too. */
export function RequireAuth(): React.JSX.Element {
	const location = useLocation();
	const me = useMe();

	if (me.isPending) {
		return (
			<div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (me.data === null || me.data === undefined) {
		const returnTo = `${location.pathname}${location.search}`;
		return <Navigate to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} replace />;
	}

	// The API refuses a blocked account everything else, so every signed-in address shows it this one page.
	if (me.data.blacklist !== null) return <BlockedPage user={me.data.user} notice={me.data.blacklist} />;

	return <Outlet />;
}
