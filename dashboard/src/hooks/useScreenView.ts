import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { api } from "@/lib/api";

/** Reports the route pattern of each screen opened, never the address; a failure is swallowed. */
export function useScreenView(): void {
	const { pathname } = useLocation();
	const params = useParams();
	const route = routePattern(pathname, params);

	useEffect(() => {
		void api.post("/screens", { route }).catch(() => undefined);
	}, [route]);
}

/** Puts each parameter back as its name, longest value first so a shorter id cannot leave a fragment. */
export function routePattern(pathname: string, params: Readonly<Record<string, string | undefined>>): string {
	const named = Object.entries(params)
		.flatMap(([name, value]) => (value === undefined || value === "" ? [] : [{ name, value }]))
		.sort((a, b) => b.value.length - a.value.length);

	return named.reduce((path, { name, value }) => path.split(value).join(`:${name}`), pathname);
}
