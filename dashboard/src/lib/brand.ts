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

/** The label a phone suggests for a home-screen shortcut, which is otherwise the page title of whichever screen is open. */
export function nameHomeScreen(name: string, doc: Document = document): void {
	for (const key of ["apple-mobile-web-app-title", "application-name"]) {
		let meta = doc.head.querySelector<HTMLMetaElement>(`meta[name="${key}"]`);
		if (meta === null) {
			meta = doc.createElement("meta");
			meta.name = key;
			doc.head.append(meta);
		}
		meta.content = name;
	}
}
