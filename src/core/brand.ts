import { resolveBotName } from "@testify/shared";

/** The bot's display name, for every surface that has no client to ask, such as an embed's footer. */

let discordName: () => string | null | undefined = () => undefined;

/** Called once by the client, which knows its own username after login. */
export function nameBot(fromDiscord: () => string | null | undefined): void {
	discordName = fromDiscord;
}

/** The Discord username, read live so a rename shows without a restart; the built-in name before login. */
export function botName(): string {
	return resolveBotName(discordName());
}
