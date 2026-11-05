import { type BotStatsSettings, type ChannelSummary } from "@testify/shared";

type Placement = { kind: "none" } | { kind: "posted" } | { kind: "gone" };

export function placementOf(settings: BotStatsSettings, channels: ChannelSummary[]): Placement {
	if (settings.channelId === null) return { kind: "none" };

	const channel = channels.find((candidate) => candidate.id === settings.channelId);
	return channel === undefined ? { kind: "gone" } : { kind: "posted" };
}

type PostAction = "post" | "move" | "repost";

export function postActionOf(settings: BotStatsSettings, chosen: string | null): PostAction {
	if (settings.channelId === null) return "post";

	return chosen === null || chosen === settings.channelId ? "repost" : "move";
}
