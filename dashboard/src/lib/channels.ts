import { type ChannelSummary } from "@testify/shared";
import { type TFunction } from "i18next";

export function channelLabel(
	channels: readonly ChannelSummary[],
	id: string | null,
	t: TFunction,
	at: "sentence" | "title" = "sentence",
): string {
	const channel = channels.find((entry) => entry.id === id);
	if (channel !== undefined && channel.name !== null) return `#${channel.name}`;

	const title = at === "title";
	if (channel === undefined) return t(title ? "common.deletedChannelTitle" : "common.deletedChannel");
	return t(title ? "common.hiddenChannelTitle" : "common.hiddenChannel");
}

export function seenChannels(channels: readonly ChannelSummary[]): (ChannelSummary & { name: string })[] {
	return channels.filter((channel): channel is ChannelSummary & { name: string } => channel.name !== null);
}
