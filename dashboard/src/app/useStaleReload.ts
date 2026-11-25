import { useEffect, useRef, useState } from "react";
import { claimAutoReload, reloadPage, type RouteFailure, sessionStore } from "@/app/routeError.utils";

/** Reloads once for a file a deploy replaced, and true until that has been decided; the ref holds off StrictMode's rerun. */
export function useStaleReload(failure: RouteFailure): boolean {
	const [reloading, setReloading] = useState(failure === "stale");
	const decided = useRef(false);

	useEffect(() => {
		if (failure !== "stale" || decided.current) return;
		decided.current = true;
		if (claimAutoReload(sessionStore())) reloadPage();
		else setReloading(false);
	}, [failure]);

	return reloading;
}
