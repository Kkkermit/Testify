import { Navigate, Outlet, useLocation } from "react-router";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";

/**
 * Hiding a screen is never access control — every route behind this is also refused by the API. This exists so
 * a signed-out visitor sees the sign-in page instead of a wall of 401s.
 */
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
		// Carried through the sign-in so they land back where they were going, not on the guild picker.
		const returnTo = `${location.pathname}${location.search}`;
		return <Navigate to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} replace />;
	}

	return <Outlet />;
}
