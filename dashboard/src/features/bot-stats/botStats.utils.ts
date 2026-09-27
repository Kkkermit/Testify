import { type BotStatsSettings, type ChannelSummary } from "@testify/shared";

/** The rules behind the bot statistics screen, kept out of the page so they can be tested without rendering. */

type Placement = { kind: "none" } | { kind: "posted"; name: string } | { kind: "gone" };

/** A channel deleted since the message was posted is named as gone, not left looking configured. */
export function placementOf(settings: BotStatsSettings, channels: ChannelSummary[]): Placement {
	if (settings.channelId === null) return { kind: "none" };

	const channel = channels.find((candidate) => candidate.id === settings.channelId);
	return channel === undefined ? { kind: "gone" } : { kind: "posted", name: channel.name };
}

type PostAction = "post" | "move" | "repost";

/** What pressing the button will do, so its label never promises something else. */
export function postActionOf(settings: BotStatsSettings, chosen: string | null): PostAction {
	if (settings.channelId === null) return "post";

	return chosen === null || chosen === settings.channelId ? "repost" : "move";
}
