import { type Env } from "@config/env";

/** Where a browser opens the website, which is rarely the port the API binds; null when nothing serves it. */
export function siteUrl(env: Env): string | null {
	if (!env.DASHBOARD_ENABLED && !env.SITE_ENABLED) return null;
	return env.DASHBOARD_BASE_URL ?? `http://${env.DASHBOARD_BIND}:${String(env.DASHBOARD_PORT)}`;
}

/** The start-up report's line for the website: where it opens, and whether the dashboard is in it. */
export function websiteLine(env: Env): string {
	const url = siteUrl(env) ?? "";
	return env.DASHBOARD_ENABLED ? url : `${url} · docs only, the dashboard is off`;
}

/** Where a browser opens the dashboard; null when it is off, however much of the website is on. */
export function dashboardUrl(env: Env): string | null {
	return env.DASHBOARD_ENABLED ? siteUrl(env) : null;
}

/** A one-line pointer at a feature's web screen, appended to its panel; null when the dashboard is off. */
export function dashboardHint(env: Env, path: string): string | null {
	const url = dashboardUrl(env);
	if (url === null) return null;

	return `You can also set this up in a browser: ${url}${path}`;
}
