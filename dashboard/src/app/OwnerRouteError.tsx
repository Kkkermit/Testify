import { useEffect, useRef, useState } from "react";
import { Navigate, useRouteError } from "react-router";
import { OWNER_ONLY_NOTICE } from "@/app/RequireOwner";
import { RouteError } from "@/app/RouteError";
import { claimAutoReload, classifyRouteError, reloadPage, sessionStore } from "@/app/routeError.utils";
import { Skeleton } from "@/components/primitives";

export function OwnerRouteError(): React.JSX.Element {
	const failure = classifyRouteError(useRouteError());
	const [reloading, setReloading] = useState(failure === "stale");
	const decided = useRef(false);

	useEffect(() => {
		if (failure !== "stale" || decided.current) return;
		decided.current = true;
		if (claimAutoReload(sessionStore())) reloadPage();
		else setReloading(false);
	}, [failure]);

	if (reloading) return <Skeleton className="h-64 w-full" />;
	if (failure === "stale") return <Navigate to="/guilds" replace state={{ notice: OWNER_ONLY_NOTICE }} />;
	return <RouteError />;
}
