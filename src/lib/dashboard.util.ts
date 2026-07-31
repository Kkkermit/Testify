import { type Env } from "@config/env";

/**
 * Where a browser opens the dashboard, which is Vite in development and a reverse proxy in production, so it is
 * rarely the port the API binds. Null when the dashboard is switched off.
 */
export function dashboardUrl(env: Env): string | null {
	if (!env.DASHBOARD_ENABLED) return null;
	return env.DASHBOARD_BASE_URL ?? `http://${env.DASHBOARD_BIND}:${String(env.DASHBOARD_PORT)}`;
}
