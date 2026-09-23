import { type MusicSource, type Query } from "@lib/music/music.types";
/** What a `/play` argument turns out to be, before anything touches the network. */

const HOSTS: { pattern: RegExp; source: MusicSource }[] = [
	{ pattern: /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i, source: "youtube" },
	{ pattern: /(^|\.)soundcloud\.com$/i, source: "soundcloud" },
	{ pattern: /(^|\.)spotify\.com$/i, source: "spotify" },
];

/** A search prefix a reader can type to force one service, mirroring yt-dlp's own `ytsearch:`. */
const PREFIXES: { prefix: string; source: MusicSource }[] = [
	{ prefix: "yt:", source: "youtube" },
	{ prefix: "sc:", source: "soundcloud" },
];

export function sourceOfHost(hostname: string): MusicSource {
	return HOSTS.find((entry) => entry.pattern.test(hostname))?.source ?? "other";
}

/** Splits a raw argument into an address to fetch or terms to search for. */
export function resolveQuery(raw: string): Query | null {
	const trimmed = raw.trim();
	if (trimmed === "") return null;

	const url = asUrl(trimmed);
	if (url !== null) return { kind: "url", url: url.toString(), source: sourceOfHost(url.hostname) };

	for (const { prefix, source } of PREFIXES) {
		if (trimmed.toLowerCase().startsWith(prefix)) {
			const terms = trimmed.slice(prefix.length).trim();
			return terms === "" ? null : { kind: "search", terms, source };
		}
	}

	return { kind: "search", terms: trimmed, source: "youtube" };
}

/** Only http(s): a `file:` or `data:` argument must read as search text rather than as something to open. */
function asUrl(value: string): URL | null {
	if (!/^https?:\/\//i.test(value)) return null;

	try {
		return new URL(value);
	} catch {
		return null;
	}
}

/** Whether an address names a whole playlist rather than one track. */
export function isPlaylistUrl(url: string): boolean {
	const parsed = asUrl(url);
	if (parsed === null) return false;

	const source = sourceOfHost(parsed.hostname);

	if (source === "youtube") {
		return parsed.pathname === "/playlist" || (parsed.searchParams.has("list") && !parsed.searchParams.has("v"));
	}
	if (source === "soundcloud") return parsed.pathname.includes("/sets/");
	if (source === "spotify") return /\/(playlist|album)\//.test(parsed.pathname);

	return false;
}
