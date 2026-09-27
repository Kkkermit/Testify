import { type APIUser, type ClientUser, Routes } from "discord.js";
import { theme } from "@config/theme";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type BotIdentity } from "@testify/shared";

/** The bot's public profile; the banner only arrives over REST, so the fetch is cached. */

/** Long enough that a busy dashboard makes one call an hour; short enough that a rebrand shows up the same day. */
const TTL_MS = 60 * 60 * 1000;

const SIZE = 256;

let cached: { value: BotIdentity; at: number } | null = null;
let connecting: { value: BotIdentity; at: number } | null = null;

/** The sign-in screen polls every two seconds while the bot connects, and one REST read a minute answers all of it. */
const CONNECTING_TTL_MS = 60 * 1000;

/** Exported for tests, which must not inherit a previous case's answer. */
export function forgetBotIdentity(): void {
	cached = null;
	connecting = null;
}

function hexOf(colour: number | null | undefined): string | null {
	return typeof colour === "number" ? `#${colour.toString(16).padStart(6, "0")}` : null;
}

export function identityOf(user: ClientUser): BotIdentity {
	return {
		id: user.id,
		name: botName(),
		username: user.username,
		avatarUrl: user.displayAvatarURL({ size: SIZE }),
		bannerUrl: user.bannerURL({ size: 1024 }) ?? null,
		accentColour: hexOf(user.accentColor),
		supportUrl: theme.supportServer,
		repositoryUrl: theme.repository,
	};
}

/** Before the gateway is ready there is no cached user, so the profile is read over REST with the bot's own token. */
async function connectingIdentity(client: TestifyClient, now: number): Promise<BotIdentity | null> {
	if (connecting !== null && now - connecting.at < CONNECTING_TTL_MS) return connecting.value;

	try {
		const user = (await client.rest.get(Routes.user())) as APIUser;
		client.restName = user.username;
		const cdn = client.rest.cdn;
		const value: BotIdentity = {
			id: user.id,
			name: botName(),
			username: user.username,
			avatarUrl:
				user.avatar === null
					? // Discord's own rule for which default avatar a user without one is shown.
						cdn.defaultAvatar(Number((BigInt(user.id) >> 22n) % 6n))
					: cdn.avatar(user.id, user.avatar, { size: SIZE }),
			bannerUrl: typeof user.banner === "string" ? cdn.banner(user.id, user.banner, { size: 1024 }) : null,
			accentColour: hexOf(user.accent_color),
			supportUrl: theme.supportServer,
			repositoryUrl: theme.repository,
		};
		connecting = { value, at: now };
		return value;
	} catch (error) {
		client.logger.debug({ err: toError(error) }, "[DASHBOARD] Could not read the bot's profile while it connects.");
		return null;
	}
}

export async function botIdentity(client: TestifyClient, now = Date.now()): Promise<BotIdentity | null> {
	if (!client.isReady()) return connectingIdentity(client, now);
	if (cached !== null && now - cached.at < TTL_MS) return cached.value;

	// A failed fetch still yields an identity — only the banner and the accent are missing from the cached user.
	try {
		await client.user.fetch();
	} catch (error) {
		client.logger.debug({ err: toError(error) }, "[DASHBOARD] Could not fetch the bot's profile for its banner.");
	}

	const value = identityOf(client.user);
	cached = { value, at: now };

	return value;
}
