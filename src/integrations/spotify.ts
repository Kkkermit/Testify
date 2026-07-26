import { z } from "zod";
import { ExternalApiError } from "../core/errors";
import { fetchJson } from "./http";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = ["user-top-read", "user-read-currently-playing", "user-read-recently-played"];

const tokenSchema = z.object({
	access_token: z.string(),
	token_type: z.string(),
	expires_in: z.number(),
	refresh_token: z.string().optional(),
});

const imageSchema = z.object({ url: z.string(), height: z.number().nullable(), width: z.number().nullable() });

const artistSchema = z.object({
	id: z.string(),
	name: z.string(),
	genres: z.array(z.string()).default([]),
	images: z.array(imageSchema).default([]),
	external_urls: z.object({ spotify: z.string() }),
});

const trackSchema = z.object({
	id: z.string(),
	name: z.string(),
	duration_ms: z.number(),
	artists: z.array(z.object({ name: z.string() })),
	album: z.object({ name: z.string(), images: z.array(imageSchema).default([]) }),
	external_urls: z.object({ spotify: z.string() }),
});

const topSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

const currentlyPlayingSchema = z.object({
	is_playing: z.boolean(),
	progress_ms: z.number().nullable(),
	item: trackSchema.nullable(),
});

export type SpotifyTrack = z.infer<typeof trackSchema>;
export type SpotifyArtist = z.infer<typeof artistSchema>;
export type SpotifyCurrentlyPlaying = z.infer<typeof currentlyPlayingSchema>;
export type TimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyCredentials {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

function basicAuth(credentials: SpotifyCredentials): string {
	return Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
}

export function authorizeUrl(credentials: SpotifyCredentials, state: string): string {
	const url = new URL(`${ACCOUNTS}/authorize`);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", credentials.clientId);
	url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
	url.searchParams.set("redirect_uri", credentials.redirectUri);
	url.searchParams.set("state", state);
	return url.toString();
}

export interface TokenSet {
	accessToken: string;
	refreshToken: string;
	tokenExpiry: Date;
}

export async function exchangeCode(credentials: SpotifyCredentials, code: string): Promise<TokenSet> {
	const payload = await fetchJson("spotify", `${ACCOUNTS}/api/token`, tokenSchema, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth(credentials)}`,
			"content-type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: credentials.redirectUri,
		}).toString(),
	});

	if (payload.refresh_token === undefined) {
		throw new ExternalApiError("spotify", new Error("Token exchange returned no refresh token"));
	}

	return {
		accessToken: payload.access_token,
		refreshToken: payload.refresh_token,
		tokenExpiry: new Date(Date.now() + payload.expires_in * 1_000),
	};
}

/** Refresh flow: Spotify may omit a new refresh token, in which case the old one stands. */
export async function refreshAccessToken(credentials: SpotifyCredentials, refreshToken: string): Promise<TokenSet> {
	const payload = await fetchJson("spotify", `${ACCOUNTS}/api/token`, tokenSchema, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth(credentials)}`,
			"content-type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
	});

	return {
		accessToken: payload.access_token,
		refreshToken: payload.refresh_token ?? refreshToken,
		tokenExpiry: new Date(Date.now() + payload.expires_in * 1_000),
	};
}

export async function topTracks(accessToken: string, range: TimeRange, limit = 10): Promise<SpotifyTrack[]> {
	const payload = await fetchJson("spotify", `${API}/me/top/tracks`, topSchema(trackSchema), {
		headers: { Authorization: `Bearer ${accessToken}` },
		query: { time_range: range, limit },
	});
	return payload.items;
}

export async function topArtists(accessToken: string, range: TimeRange, limit = 10): Promise<SpotifyArtist[]> {
	const payload = await fetchJson("spotify", `${API}/me/top/artists`, topSchema(artistSchema), {
		headers: { Authorization: `Bearer ${accessToken}` },
		query: { time_range: range, limit },
	});
	return payload.items;
}

export async function currentlyPlaying(accessToken: string): Promise<SpotifyCurrentlyPlaying | null> {
	try {
		return await fetchJson("spotify", `${API}/me/player/currently-playing`, currentlyPlayingSchema, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
	} catch {
		// A 204 with no body means nothing is playing.
		return null;
	}
}
