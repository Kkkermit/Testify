import { DEFAULT_BOT_NAME } from "@testify/shared";

const STORAGE_KEY = "testify:botName";

/** The name the bot last reported, so a returning visitor sees it before `/api/bot` has answered. */
export function rememberedBotName(): string | null {
	try {
		const name = localStorage.getItem(STORAGE_KEY);
		return name === null || name.trim() === "" ? null : name;
	} catch {
		return null;
	}
}

export function rememberBotName(name: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, name);
	} catch {
		// A browser that refuses storage just shows the placeholder again next time.
	}
}

/** What to call the bot before `/api/bot` has answered: the name it last gave, else the built-in one. */
export const BUILT_IN_BOT_NAME: string = rememberedBotName() ?? DEFAULT_BOT_NAME;
