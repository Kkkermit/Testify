/** Used only before Discord has said what the bot is called. */
export const DEFAULT_BOT_NAME = "Testify";

export function resolveBotName(discord?: string | null): string {
	const name = discord?.trim() ?? "";
	return name === "" ? DEFAULT_BOT_NAME : name;
}
