import { type ChannelSummary, type FeaturePlaces } from "@testify/shared";

export type VisibleChannel = ChannelSummary & { name: string };

export interface ChannelGroup {
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

export function featuresIn(features: readonly FeaturePlaces[], channelId: string): FeaturePlaces[] {
	return features.filter((feature) => feature.places.some((place) => place.channelId === channelId));
}

export function channelPath(guildId: string, channelId: string): string {
	return `/guilds/${guildId}/channels/${channelId}`;
}
