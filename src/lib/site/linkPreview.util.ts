import { type Env } from "@config/env";
import { strings } from "@config/strings";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { botIdentity } from "@lib/bot/botIdentity.util";
import { siteUrl } from "@lib/bot/dashboard.util";

/** What a link to the website unfurls into: a crawler reads the page's head and runs none of its script. */
export interface LinkPreview {
	name: string;
	description: string;
	imageUrl: string | null;
	/** A banner is drawn across the card; a picture sits beside the text. */
	wide: boolean;
	url: string | null;
}

/** Long enough for a cached profile, short enough that a slow Discord never holds up the page. */
export const PREVIEW_WAIT_MS = 1_500;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** The bot's name is whatever its owner typed, so everything written into the page is escaped. */
export function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export function previewTags(preview: LinkPreview): string {
	const tags: [string, string, string][] = [
		["name", "description", preview.description],
		["property", "og:type", "website"],
		["property", "og:site_name", preview.name],
		["property", "og:title", preview.name],
		["property", "og:description", preview.description],
		["name", "twitter:card", preview.wide ? "summary_large_image" : "summary"],
		["name", "twitter:title", preview.name],
		["name", "twitter:description", preview.description],
	];
	if (preview.url !== null) tags.push(["property", "og:url", preview.url]);
	if (preview.imageUrl !== null) {
		tags.push(["property", "og:image", preview.imageUrl], ["name", "twitter:image", preview.imageUrl]);
	}
	return tags.map(([kind, key, value]) => `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`).join("\n\t\t");
}

/** The page shell titled with the bot's name and carrying its preview; a shell without a head is left alone. */
export function withPreview(index: string, preview: LinkPreview): string {
	if (!index.includes("</head>")) return index;
	// Replaced through functions, so a `$&` in somebody's bot name stays literal.
	const titled = index.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(preview.name)}</title>`);
	return titled.replace("</head>", () => `\t${previewTags(preview)}\n\t</head>`);
}

function within<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const late = new Promise<T>((resolve) => {
		timer = setTimeout(() => resolve(fallback), ms);
	});
	return Promise.race([task.catch(() => fallback), late]).finally(() => clearTimeout(timer));
}

/** The address this page is reached at, when the host has said; a path that will not parse leaves it out. */
function pageUrl(env: Env, path: string): string | null {
	const base = siteUrl(env);
	if (base === null) return null;
	try {
		return new URL(path, base).toString();
	} catch {
		return null;
	}
}

/** The bot's banner as a PNG when it has one, since not every site that unfurls a link reads WebP. */
export async function readLinkPreview(client: TestifyClient, env: Env, path: string): Promise<LinkPreview> {
	const identity = await within(botIdentity(client), PREVIEW_WAIT_MS, null);
	const name = identity?.name ?? botName();
	const user = identity !== null && client.isReady() ? client.user : null;

	const banner =
		user === null ? (identity?.bannerUrl ?? null) : user.bannerURL({ extension: "png", size: 1024, forceStatic: true });
	const picture =
		user === null
			? (identity?.avatarUrl ?? null)
			: user.displayAvatarURL({ extension: "png", size: 512, forceStatic: true });

	return {
		name,
		description: strings.site.preview(name),
		imageUrl: banner ?? picture,
		wide: banner !== null && banner !== undefined,
		url: pageUrl(env, path),
	};
}
