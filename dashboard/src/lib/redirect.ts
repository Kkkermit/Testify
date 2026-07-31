/**
 * Signing in and signing out leave the SPA entirely — one goes to Discord, the other has to drop every cached
 * query — so they are full page loads rather than client routes.
 */
export function hardRedirect(url: string): void {
	window.location.assign(url);
}
