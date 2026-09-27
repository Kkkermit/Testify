/** Signing in and out leave the SPA entirely, so both are full page loads rather than client routes. */
export function hardRedirect(url: string): void {
	window.location.assign(url);
}
