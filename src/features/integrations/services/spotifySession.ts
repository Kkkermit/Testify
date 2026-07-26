import { createHmac, timingSafeEqual } from "node:crypto";
import { ConfigurationError, UserFacingError } from "../../../core/errors";
import { type TestifyClient } from "../../../core/client";
import { getSpotifyTokens, saveSpotifyTokens } from "../../../database/repositories/integrationRepository";
import { refreshAccessToken, type SpotifyCredentials } from "../../../integrations/spotify";

const STATE_TTL_MS = 10 * 60 * 1_000;

export function spotifyCredentials(client: TestifyClient): SpotifyCredentials {
	const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = client.env;

	if (SPOTIFY_CLIENT_ID === undefined || SPOTIFY_CLIENT_SECRET === undefined || SPOTIFY_REDIRECT_URI === undefined) {
		throw new ConfigurationError("Spotify is not configured on this instance.");
	}

	return { clientId: SPOTIFY_CLIENT_ID, clientSecret: SPOTIFY_CLIENT_SECRET, redirectUri: SPOTIFY_REDIRECT_URI };
}

function secretFor(client: TestifyClient): string {
	const secret = client.env.OAUTH_STATE_SECRET;
	if (secret === undefined) {
		throw new ConfigurationError("OAUTH_STATE_SECRET is not set, so OAuth linking is disabled.");
	}
	return secret;
}

/**
 * The OAuth `state` is signed and time-limited. Previously it was taken as the
 * Discord user ID with no verification at all, so anyone crafting a callback URL
 * could bind their Spotify account to an arbitrary Discord user.
 */
export function signState(client: TestifyClient, userId: string, now: number = Date.now()): string {
	const payload = `${userId}.${now}`;
	const signature = createHmac("sha256", secretFor(client)).update(payload).digest("base64url");
	return `${payload}.${signature}`;
}

export function verifyState(client: TestifyClient, state: string, now: number = Date.now()): string {
	const [userId, issuedAt, signature] = state.split(".");
	if (userId === undefined || issuedAt === undefined || signature === undefined) {
		throw new UserFacingError("That authorisation link is malformed.");
	}

	const expected = createHmac("sha256", secretFor(client)).update(`${userId}.${issuedAt}`).digest("base64url");
	const supplied = Buffer.from(signature);
	const computed = Buffer.from(expected);

	if (supplied.length !== computed.length || !timingSafeEqual(supplied, computed)) {
		throw new UserFacingError("That authorisation link failed verification.");
	}

	if (now - Number.parseInt(issuedAt, 10) > STATE_TTL_MS) {
		throw new UserFacingError("That authorisation link has expired. Run the command again.");
	}

	return userId;
}

/** Returns a usable access token, refreshing and re-persisting it when expired. */
export async function accessTokenFor(client: TestifyClient, discordId: string): Promise<string> {
	const stored = await getSpotifyTokens(discordId, client.env.TOKEN_ENCRYPTION_KEY);
	if (!stored) throw new UserFacingError("You have not linked your Spotify account. Run `/spotify login` first.");

	if (stored.tokenExpiry.getTime() > Date.now() + 30_000) return stored.accessToken;

	const refreshed = await refreshAccessToken(spotifyCredentials(client), stored.refreshToken);
	await saveSpotifyTokens(discordId, refreshed, client.env.TOKEN_ENCRYPTION_KEY);
	return refreshed.accessToken;
}
