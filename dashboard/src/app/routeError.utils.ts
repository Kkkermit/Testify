import { isRouteErrorResponse } from "react-router";

type RouteFailure = "stale" | "notFound" | "crash";

/** Chrome, Firefox and Safari each word a failed `import()` differently; all three mean the file moved. */
const STALE_MODULE = [
	"Failed to fetch dynamically imported module",
	"error loading dynamically imported module",
	"Importing a module script failed",
];

export function classifyRouteError(error: unknown): RouteFailure {
	if (isRouteErrorResponse(error)) return error.status === 404 ? "notFound" : "crash";
	if (error instanceof Error && STALE_MODULE.some((phrase) => error.message.includes(phrase))) return "stale";
	return "crash";
}

const RELOADED_AT = "testify:staleReloadAt";
/** Long enough to cover a reload that fails again the same way, short enough that a later deploy still reloads. */
const RELOAD_WINDOW_MS = 30_000;

/** True at most once per window, so a chunk that is genuinely missing shows the screen instead of reloading for ever. */
export function claimAutoReload(storage: Pick<Storage, "getItem" | "setItem"> | null, now = Date.now()): boolean {
	if (storage === null) return false;

	try {
		const last = storage.getItem(RELOADED_AT);
		if (last !== null && now - Number(last) < RELOAD_WINDOW_MS) return false;
		storage.setItem(RELOADED_AT, String(now));
		return true;
	} catch {
		return false;
	}
}

export function sessionStore(): Storage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

export function reloadPage(): void {
	window.location.reload();
}

/** What the development build prints under the message; production never renders it. */
export function errorDetails(error: unknown): string {
	if (isRouteErrorResponse(error)) return `${String(error.status)} ${error.statusText}`;
	if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`;
	return String(error);
}
