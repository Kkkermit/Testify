import { type Env } from "@config/env";
import { type HealthResponse } from "@testify/shared";

type ProbeEnv = Pick<Env, "SITE_ENABLED" | "DASHBOARD_ENABLED" | "DASHBOARD_PORT" | "DASHBOARD_BIND">;

/** Where the bot answers its own health route from inside its container, or null when no listener is open. */
export function healthUrl(env: ProbeEnv): string | null {
	if (!env.SITE_ENABLED && !env.DASHBOARD_ENABLED) return null;

	const everywhere = env.DASHBOARD_BIND === "0.0.0.0" || env.DASHBOARD_BIND === "::";
	const host = everywhere ? "127.0.0.1" : env.DASHBOARD_BIND;
	return `http://${host.includes(":") ? `[${host}]` : host}:${String(env.DASHBOARD_PORT)}/api/health`;
}

/** Healthy only when Discord and the database are both connected. */
export function isHealthy(body: unknown): body is HealthResponse {
	return typeof body === "object" && body !== null && (body as Partial<HealthResponse>).ok === true;
}
