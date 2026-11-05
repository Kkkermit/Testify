import { isScreenRoute, type ScreenView } from "@testify/shared";
import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import { api } from "@/lib/api";

export function useScreenView(): void {
	const { pathname } = useLocation();
	const params = useParams();
	const view = screenView(pathname, params);
	const route = view?.route;
	const guildId = view?.guildId;

	useEffect(() => {
		if (route === undefined) return;
		void api.post("/screens", guildId === undefined ? { route } : { route, guildId }).catch(() => undefined);
	}, [route, guildId]);
}

export function screenView(pathname: string, params: Readonly<Record<string, string | undefined>>): ScreenView | null {
	const route = routePattern(pathname, params);
	if (!isScreenRoute(route)) return null;
	const guildId = params.guildId;

	return guildId !== undefined && /^\d{17,20}$/.test(guildId) ? { route, guildId } : { route };
}

/** Puts each parameter back as its name, longest value first so a shorter id cannot leave a fragment. */
export function routePattern(pathname: string, params: Readonly<Record<string, string | undefined>>): string {
	const named = Object.entries(params)
		.flatMap(([name, value]) => (value === undefined || value === "" ? [] : [{ name, value }]))
		.sort((a, b) => b.value.length - a.value.length);

	return named.reduce((path, { name, value }) => path.split(value).join(`:${name}`), pathname);
}
