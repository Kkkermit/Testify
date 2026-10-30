import { type DataRouter, type Location, NavigationType } from "react-router";

/** The page a docs or source link was followed from, kept per history entry so Back and Forward find it again. */
export interface Trail {
	pathname: string;
	search: string;
	hash: string;
}

const STORAGE_KEY = "testify:trail";
const KEPT = 50;
const remembered = new Map<string, Trail>();

/** The docs and the source browser are where one page leads to another. */
export function leadsOn(pathname: string): boolean {
	return /^\/(?:docs|source-code)(?:\/|$)/.test(pathname);
}

/** These pages never write their own address, so returning to the top on arrival cannot undo a filter or a tab. */
export function remembersScroll(pathname: string): boolean {
	return leadsOn(pathname) || ["/", "/appearance", "/terms", "/privacy"].includes(pathname);
}

/** Records the trail before React renders the page it leads to, so the page can show it on its first render. */
export function followTrails(router: Pick<DataRouter, "state" | "subscribe">): () => void {
	let last: Location = router.state.location;

	return router.subscribe((state) => {
		const from = last;
		if (state.location.key === from.key) return;
		last = state.location;

		if (state.historyAction !== NavigationType.Push || !leadsOn(from.pathname)) return;
		if (from.pathname === state.location.pathname) return;
		rememberTrail(state.location.key, { pathname: from.pathname, search: from.search, hash: from.hash });
	});
}

export function rememberTrail(key: string, trail: Trail): void {
	remembered.set(key, trail);
	try {
		const kept = Object.entries({ ...stored(), [key]: trail }).slice(-KEPT);
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
	} catch {
		// Without storage the trail lasts until a reload, which is all a private window asks of it.
	}
}

export function trailFor(key: string): Trail | null {
	return remembered.get(key) ?? asTrail(stored()[key]);
}

function stored(): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
		return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/** Only a page on this site, so nothing written into storage by hand becomes a link off it. */
function asTrail(value: unknown): Trail | null {
	if (typeof value !== "object" || value === null) return null;
	const { pathname, search, hash } = value as Partial<Record<keyof Trail, unknown>>;
	if (typeof pathname !== "string" || typeof search !== "string" || typeof hash !== "string") return null;

	return leadsOn(pathname) ? { pathname, search, hash } : null;
}
