import { UserFacingError } from "@core/errors";
import { getBotSettings, saveBotSettings, type StoredBotSettings } from "@database/repositories/botSettingsRepository";
import { type MusicSource, type Query } from "@lib/music/music.types";
import { DEFAULT_MUSIC_SOURCES, type MusicSourceChoice, type MusicSourceSetting } from "@testify/shared";

/** Which services the player takes music from, as the bot's owner chose for every server at once. */

export function normaliseMusicSources(stored: StoredBotSettings): MusicSourceSetting {
	return { sources: stored?.musicSources ?? DEFAULT_MUSIC_SOURCES, configured: stored !== null };
}

export async function readMusicSourceSetting(): Promise<MusicSourceSetting> {
	return normaliseMusicSources(await getBotSettings());
}

export async function readMusicSources(): Promise<MusicSourceChoice> {
	return (await readMusicSourceSetting()).sources;
}

const NAMES: Record<MusicSourceChoice, string> = {
	both: "YouTube and SoundCloud",
	youtube: "YouTube only",
	soundcloud: "SoundCloud only",
};

export function sourcesName(sources: MusicSourceChoice): string {
	return NAMES[sources];
}

export async function applyMusicSources(
	sources: MusicSourceChoice,
	actorId: string | null,
): Promise<MusicSourceSetting> {
	await saveBotSettings({ musicSources: sources }, actorId);
	return { sources, configured: true };
}

/** Links to any other site are not the owner's to switch, so only YouTube and SoundCloud can be refused. */
export function allowsSource(sources: MusicSourceChoice, source: MusicSource): boolean {
	if (source === "youtube") return sources !== "soundcloud";
	if (source === "soundcloud") return sources !== "youtube";

	return true;
}

const SOURCE_LINES: Record<MusicSourceChoice, string> = {
	both: "🎵 **Sources** — YouTube and SoundCloud. `/play` suggests from both, and falls back to SoundCloud when YouTube refuses.",
	youtube: "🎵 **Sources** — YouTube only. The bot's owner has switched SoundCloud off.",
	soundcloud: "🎵 **Sources** — SoundCloud only. The bot's owner has switched YouTube off.",
};

/** What `/music status` says about the owner's choice. */
export function sourcesLine(sources: MusicSourceChoice): string {
	return SOURCE_LINES[sources];
}

/** Where a search that names no service goes. */
export function searchSourceFor(sources: MusicSourceChoice): MusicSource {
	return sources === "soundcloud" ? "soundcloud" : "youtube";
}

/** Only a plain search on YouTube moves to SoundCloud, and only while the owner allows both. */
export function fallsBackToSoundCloud(query: Query, sources: MusicSourceChoice): boolean {
	return sources === "both" && query.kind === "search" && query.named !== true && query.source === "youtube";
}

const OFF: Record<"youtube" | "soundcloud", string> = {
	youtube: "The bot's owner has switched YouTube off, so music comes from SoundCloud only. Search by name instead.",
	soundcloud:
		"The bot's owner has switched SoundCloud off, so music comes from YouTube only. Search by name with `/play`.",
};

/** The query as the owner's choice allows it: an unnamed search goes where they point, and a service they turned off is refused. */
export function withinSources(query: Query, sources: MusicSourceChoice): Query {
	if (query.kind === "search" && query.named !== true) return { ...query, source: searchSourceFor(sources) };

	if (query.source === "youtube" || query.source === "soundcloud") {
		if (!allowsSource(sources, query.source)) throw new UserFacingError(OFF[query.source]);
	}

	return query;
}
