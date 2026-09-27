import { type Env } from "@config/env";

/** Where a browser opens the dashboard, which is rarely the port the API binds; null when it is off. */
export function dashboardUrl(env: Env): string | null {
	if (!env.DASHBOARD_ENABLED) return null;
	return env.DASHBOARD_BASE_URL ?? `http://${env.DASHBOARD_BIND}:${String(env.DASHBOARD_PORT)}`;
}

/** A one-line pointer at a feature's web screen, appended to its panel; null when the dashboard is off. */
export function dashboardHint(env: Env, path: string): string | null {
	const url = dashboardUrl(env);
	if (url === null) return null;

	return `You can also set this up in a browser: ${url}${path}`;
}
