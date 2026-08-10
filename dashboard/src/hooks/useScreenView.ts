import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { api } from "@/lib/api";

/**
 * Reports which screen was opened, once per navigation.
 *
 * It sends the route **pattern** — `/guilds/:guildId/levelling` — never the address, so no server id and no
 * member id ever reaches the count. A failure is swallowed: an analytics write must not break a navigation.
 */
export function useScreenView(): void {
	const { pathname } = useLocation();
	const params = useParams();
	const route = routePattern(pathname, params);

	useEffect(() => {
		void api.post("/screens", { route }).catch(() => undefined);
	}, [route]);
}

/**
 * Puts each matched parameter back as its name, so two admins configuring two servers land on one row.
 *
 * Longest value first: a shorter id that happens to be a substring of a longer one would otherwise be replaced
 * inside it and leave a fragment behind.
 */
export function routePattern(pathname: string, params: Readonly<Record<string, string | undefined>>): string {
	const named = Object.entries(params)
		.flatMap(([name, value]) => (value === undefined || value === "" ? [] : [{ name, value }]))
		.sort((a, b) => b.value.length - a.value.length);

	return named.reduce((path, { name, value }) => path.split(value).join(`:${name}`), pathname);
}
