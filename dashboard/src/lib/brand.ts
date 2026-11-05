import { DEFAULT_BOT_NAME } from "@testify/shared";

const STORAGE_KEY = "testify:botName";
const LOOK_KEY = "testify:botLook";

export interface BotLook {
	name: string | null;
	avatarUrl: string | null;
	bannerUrl: string | null;
	accentColour: string | null;
}

/** Only Discord's own CDN, because what comes back out of storage is whatever was last written there. */
function cdnUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" && url.hostname === "cdn.discordapp.com" ? url.href : null;
	} catch {
		return null;
	}
}

function hexColour(value: unknown): string | null {
	return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

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

export function rememberedBotLook(): BotLook {
	let stored: Record<string, unknown> = {};
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "null");
		if (typeof parsed === "object" && parsed !== null) stored = parsed as Record<string, unknown>;
	} catch {
		// Unreadable storage is the same as none.
	}

	return {
		name: rememberedBotName(),
		avatarUrl: cdnUrl(stored.avatarUrl),
		bannerUrl: cdnUrl(stored.bannerUrl),
		accentColour: hexColour(stored.accentColour),
	};
}

export function rememberBotLook(look: Omit<BotLook, "name">): void {
	try {
		localStorage.setItem(
			LOOK_KEY,
			JSON.stringify({ avatarUrl: look.avatarUrl, bannerUrl: look.bannerUrl, accentColour: look.accentColour }),
		);
	} catch {
		// A browser that refuses storage shows the picture once `/api/bot` answers instead.
	}
}

export function showBotIcon(url: string, doc: Document = document): void {
	for (const link of doc.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) {
		link.removeAttribute("type");
		link.removeAttribute("sizes");
		link.href = url;
	}
}

export const BUILT_IN_BOT_NAME: string = rememberedBotName() ?? DEFAULT_BOT_NAME;

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
