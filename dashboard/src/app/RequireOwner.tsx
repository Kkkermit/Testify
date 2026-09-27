import { Outlet } from "react-router";
import { Skeleton } from "@/components/primitives";
import { useMe } from "@/features/auth/useMe";
import { NotFoundContent } from "@/features/not-found/NotFoundPage";

/** Shows a non-owner the same 404 as a mistyped address, matching the API's refusal. */
export function RequireOwner(): React.JSX.Element {
	const me = useMe();

	if (me.isPending) return <Skeleton className="h-64 w-full" />;
	if (me.data?.isOwner !== true) return <NotFoundContent />;

	return <Outlet />;
}
