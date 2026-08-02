import { type Env } from "@config/env";

/**
 * Where a browser opens the dashboard, which is Vite in development and a reverse proxy in production, so it is
 * rarely the port the API binds. Null when the dashboard is switched off.
 */
export function dashboardUrl(env: Env): string | null {
	if (!env.DASHBOARD_ENABLED) return null;
	return env.DASHBOARD_BASE_URL ?? `http://${env.DASHBOARD_BIND}:${String(env.DASHBOARD_PORT)}`;
}

/**
 * A one-line pointer at the web screen for a feature, or null when the dashboard is switched off.
 *
 * Appended to a panel rather than replacing it: the Discord panel is still the fastest way to change one
 * setting, and the dashboard is the better way to change several.
 */
export function dashboardHint(env: Env, path: string): string | null {
	const url = dashboardUrl(env);
	if (url === null) return null;

	return `You can also set this up in a browser: ${url}${path}`;
}
