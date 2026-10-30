import { type ChannelSummary } from "@testify/shared";
import { type TFunction } from "i18next";

/** A channel by id, named as the reader may know it: by name, as one they cannot see in Discord, or as gone. */
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

/** Only channels the reader can see are ever offered, as Discord's own pickers offer them. */
export function seenChannels(channels: readonly ChannelSummary[]): (ChannelSummary & { name: string })[] {
	return channels.filter((channel): channel is ChannelSummary & { name: string } => channel.name !== null);
}
