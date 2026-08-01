import { type ClientUser } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { type BotIdentity } from "@testify/shared";

/**
 * The bot's own public profile, for the dashboard's sign-in screen and sidebar.
 *
 * The banner is the reason this is not a one-liner: it never arrives in the gateway's READY payload, so
 * `client.user` has no banner until the user is fetched over REST. That is a rate-limited call for a value that
 * changes when somebody edits the application, hence the cache.
 */

/** Long enough that a busy dashboard makes one call an hour; short enough that a rebrand shows up the same day. */
const TTL_MS = 60 * 60 * 1000;

const SIZE = 256;

let cached: { value: BotIdentity; at: number } | null = null;

/** Exported for tests, which must not inherit a previous case's answer. */
export function forgetBotIdentity(): void {
	cached = null;
}

export function identityOf(user: ClientUser): BotIdentity {
	return {
		id: user.id,
		username: user.username,
		avatarUrl: user.displayAvatarURL({ size: SIZE }),
		bannerUrl: user.bannerURL({ size: 1024 }) ?? null,
		accentColour: typeof user.accentColor === "number" ? `#${user.accentColor.toString(16).padStart(6, "0")}` : null,
	};
}

export async function botIdentity(client: TestifyClient, now = Date.now()): Promise<BotIdentity | null> {
	if (!client.isReady()) return null;
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
