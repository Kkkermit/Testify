import { Navigate, useRouteError } from "react-router";
import { OWNER_ONLY_NOTICE } from "@/app/RequireOwner";
import { RouteError } from "@/app/RouteError";
import { classifyRouteError } from "@/app/routeError.utils";
import { useStaleReload } from "@/app/useStaleReload";
import { Skeleton } from "@/components/primitives";

export function OwnerRouteError(): React.JSX.Element {
	const failure = classifyRouteError(useRouteError());
	const reloading = useStaleReload(failure);

	if (reloading) return <Skeleton className="h-64 w-full" />;
	if (failure === "stale") return <Navigate to="/guilds" replace state={{ notice: OWNER_ONLY_NOTICE }} />;
	return <RouteError />;
}
