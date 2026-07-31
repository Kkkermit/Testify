import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiProblem } from "@api/errors";
import { type DashboardUser } from "@testify/shared";

/**
 * Everything that talks to Discord's OAuth2 endpoints. The browser never gets a token and never calls Discord
 * itself — it talks to this API, which holds the client secret.
 */

const API = "https://discord.com/api/v10";
const SCOPES = "identify guilds";

export interface OauthTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
}

/** The user's guild list as Discord reports it, with **their** permission bitfield in each. */
export interface OauthGuild {
	id: string;
	name: string;
	icon: string | null;
	permissions: string;
}

export interface PendingLogin {
	state: string;
	verifier: string;
	returnTo: string;
}

export function callbackUrl(baseUrl: string): string {
	return `${baseUrl.replace(/\/+$/, "")}/api/auth/callback`;
}

/**
 * PKCE closes authorization-code interception if the redirect ever leaks through a referrer or a proxy log. It
 * is belt-and-braces for a client that has a secret anyway, and it costs nothing.
 */
export function startLogin(returnTo: string): PendingLogin {
	return {
		state: randomBytes(32).toString("base64url"),
		verifier: randomBytes(32).toString("base64url"),
		returnTo,
	};
}

export function authoriseUrl(clientId: string, baseUrl: string, pending: PendingLogin): string {
	const challenge = createHash("sha256").update(pending.verifier).digest("base64url");

	const query = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		scope: SCOPES,
		state: pending.state,
		redirect_uri: callbackUrl(baseUrl),
		code_challenge: challenge,
		code_challenge_method: "S256",
		// Skips the consent screen for anyone who has authorised before, which makes returning feel instant.
		prompt: "none",
	});

	return `https://discord.com/oauth2/authorize?${query.toString()}`;
}

/**
 * Without this an attacker can hand a victim a callback URL carrying the attacker's code, logging the victim
 * into the attacker's account — and any guild they then configure is configured on the attacker's behalf.
 */
export function statesMatch(fromDiscord: string, fromCookie: string): boolean {
	const left = Buffer.from(fromDiscord);
	const right = Buffer.from(fromCookie);

	return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

async function token(body: URLSearchParams): Promise<OauthTokens> {
	const response = await fetch(`${API}/oauth2/token`, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body,
	});

	if (!response.ok) {
		throw new ApiProblem(502, "discord_unreachable", "Discord would not complete the sign-in. Try again.");
	}

	const data = (await response.json()) as TokenResponse;

	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresAt: new Date(Date.now() + data.expires_in * 1_000),
	};
}

export async function exchangeCode(
	credentials: { clientId: string; clientSecret: string; baseUrl: string },
	code: string,
	verifier: string,
): Promise<OauthTokens> {
	return token(
		new URLSearchParams({
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: "authorization_code",
			code,
			redirect_uri: callbackUrl(credentials.baseUrl),
			code_verifier: verifier,
		}),
	);
}

export async function refreshTokens(
	credentials: { clientId: string; clientSecret: string },
	refreshToken: string,
): Promise<OauthTokens> {
	return token(
		new URLSearchParams({
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	);
}

async function authed<T>(path: string, accessToken: string): Promise<T> {
	const response = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });

	if (response.status === 401) throw new ApiProblem(401, "unauthenticated", "Discord no longer accepts that sign-in.");
	if (!response.ok) throw new ApiProblem(502, "discord_unreachable", "Discord did not answer. Try again shortly.");

	return (await response.json()) as T;
}

interface DiscordUser {
	id: string;
	username: string;
	global_name: string | null;
	avatar: string | null;
}

export async function fetchUser(accessToken: string): Promise<DashboardUser & { avatar: string | null }> {
	const user = await authed<DiscordUser>("/users/@me", accessToken);

	return {
		id: user.id,
		username: user.global_name ?? user.username,
		avatar: user.avatar,
		avatarUrl: avatarUrl(user.id, user.avatar),
	};
}

export async function fetchGuilds(accessToken: string): Promise<OauthGuild[]> {
	return authed<OauthGuild[]>("/users/@me/guilds", accessToken);
}

export function avatarUrl(userId: string, avatar: string | null): string | null {
	return avatar === null ? null : `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`;
}

export function guildIconUrl(guildId: string, icon: string | null): string | null {
	return icon === null ? null : `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128`;
}

const MANAGE_GUILD = 1n << 5n;

/**
 * Good enough to decide what to *show* in the picker. It is a login-time snapshot of a different system, so it
 * is never what authorises a write — `requireGuild` fetches the member live for that.
 */
export function canManage(permissions: string): boolean {
	try {
		return (BigInt(permissions) & MANAGE_GUILD) === MANAGE_GUILD;
	} catch {
		return false;
	}
}
