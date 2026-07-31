import { type Context } from "hono";
import { ApiProblem } from "@api/errors";
import { type Env } from "@config/env";
import { createSecretBox, type SecretBox } from "@lib/secretBox.util";

/**
 * A self-hoster's first run is `DASHBOARD_ENABLED=true` with nothing else filled in. That must show them what to
 * add rather than crash, so the API starts either way and this is how the rest of it asks whether it can sign
 * anyone in.
 */
export interface OauthConfig {
	clientId: string;
	clientSecret: string;
	baseUrl: string;
	box: SecretBox;
	sessionTtlDays: number;
}

const REQUIRED = ["DISCORD_CLIENT_SECRET", "DASHBOARD_BASE_URL", "DASHBOARD_SESSION_SECRET"] as const;

export function missingSettings(env: Env): string[] {
	return REQUIRED.filter((key) => env[key] === undefined);
}

export function oauthConfigFrom(env: Env): OauthConfig | null {
	if (env.DISCORD_CLIENT_SECRET === undefined) return null;
	if (env.DASHBOARD_BASE_URL === undefined) return null;
	if (env.DASHBOARD_SESSION_SECRET === undefined) return null;

	return {
		clientId: env.DISCORD_CLIENT_ID,
		clientSecret: env.DISCORD_CLIENT_SECRET,
		baseUrl: env.DASHBOARD_BASE_URL,
		box: createSecretBox(env.DASHBOARD_SESSION_SECRET),
		sessionTtlDays: env.DASHBOARD_SESSION_TTL_DAYS,
	};
}

/** 503 rather than 500: nothing is broken, the install is not finished. */
export function requireOauth(context: Context): OauthConfig {
	const oauth = context.get("oauth") as OauthConfig | null;

	if (oauth === null) {
		throw new ApiProblem(503, "setup_required", "The dashboard has not been configured yet. See /setup.");
	}

	return oauth;
}
