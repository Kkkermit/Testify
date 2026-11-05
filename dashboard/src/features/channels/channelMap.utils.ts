import { type ChannelSummary, type FeaturePlaces, type PlaceKind } from "@testify/shared";

/** A channel the dashboard can show: one its reader can see, of a kind a feature can work in. */
export type VisibleChannel = ChannelSummary & { name: string };

export interface ChannelGroup {
	/** Null for the channels that sit above every category, as Discord lists them. */
	category: { id: string; name: string | null } | null;
	channels: VisibleChannel[];
}

const LISTED = new Set<ChannelSummary["kind"]>(["text", "announcement", "voice"]);

function visible(channel: ChannelSummary): channel is VisibleChannel {
	return channel.name !== null && LISTED.has(channel.kind);
}

/** Text channels before voice ones, each by position, which is how Discord lists a category. */
function byDiscordOrder(a: ChannelSummary, b: ChannelSummary): number {
	const voice = Number(a.kind === "voice") - Number(b.kind === "voice");
	return voice !== 0 ? voice : a.position - b.position;
}

/** The server's channels in Discord's categories and order, leaving out anything the reader cannot see. */
export function channelTree(channels: readonly ChannelSummary[]): ChannelGroup[] {
	const shown = channels.filter(visible);
	const categories = channels.filter((channel) => channel.kind === "category").sort((a, b) => a.position - b.position);
	const known = new Set(categories.map((category) => category.id));

	const loose = shown.filter((channel) => channel.parentId === null || !known.has(channel.parentId));
	const groups: ChannelGroup[] = loose.length > 0 ? [{ category: null, channels: loose.sort(byDiscordOrder) }] : [];

	for (const category of categories) {
		const inside = shown.filter((channel) => channel.parentId === category.id).sort(byDiscordOrder);
		if (inside.length > 0) groups.push({ category: { id: category.id, name: category.name }, channels: inside });
	}

	return groups;
}

/** How many features work in each channel, counting a feature once however many roles it has there. */
export function featureCounts(features: readonly FeaturePlaces[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const feature of features) {
		for (const channelId of new Set(feature.places.map((place) => place.channelId))) {
			counts.set(channelId, (counts.get(channelId) ?? 0) + 1);
		}
	}

	return counts;
}

/** Everything a channel holds, in the order the features are listed. */
export function featuresIn(features: readonly FeaturePlaces[], channelId: string): FeaturePlaces[] {
	return features.filter((feature) => feature.places.some((place) => place.channelId === channelId));
}

export function channelPath(guildId: string, channelId: string): string {
	return `/guilds/${guildId}/channels/${channelId}`;
}

/** The channels a feature taking `accepts` can be placed in: text ones the bot can post in, or any voice one. */
export function placeableIn(channels: readonly ChannelSummary[], accepts: PlaceKind): VisibleChannel[] {
	return channelTree(channels)
		.flatMap((group) => group.channels)
		.filter((channel) =>
			accepts === "voice" ? channel.kind === "voice" : channel.kind !== "voice" && channel.canSend,
		);
}

/** What a channel can take when something is dragged onto it. */
export function kindOf(channel: ChannelSummary): PlaceKind {
	return channel.kind === "voice" ? "voice" : "text";
}
