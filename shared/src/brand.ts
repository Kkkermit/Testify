/** Used only when `.env` sets no `BOT_NAME` and Discord has not yet said what the bot is called. */
export const DEFAULT_BOT_NAME = "Testify";

/** Discord's own limit on a username, so a configured name fits anywhere a username does. */
export const BOT_NAME_MAX = 32;

/** `BOT_NAME` from `.env` wins, because it is an explicit choice; then the bot's Discord username; then the default. */
export function resolveBotName(configured?: string | null, discord?: string | null): string {
	const chosen = [configured, discord].find((name) => name !== undefined && name !== null && name.trim() !== "");
	return chosen?.trim() ?? DEFAULT_BOT_NAME;
}
