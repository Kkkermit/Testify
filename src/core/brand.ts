import { resolveBotName } from "@testify/shared";

/** The bot's display name, for every surface that has no client to ask, such as an embed's footer. */

let configured: string | undefined;
let discordName: () => string | undefined = () => undefined;

/** Called once by the client, which knows both `BOT_NAME` and, after login, its own username. */
export function nameBot(fromEnv: string | undefined, fromDiscord: () => string | undefined): void {
	configured = fromEnv;
	discordName = fromDiscord;
}

/** `BOT_NAME` from `.env`, else the Discord username, else the built-in name. */
export function botName(): string {
	return resolveBotName(configured, discordName());
}
