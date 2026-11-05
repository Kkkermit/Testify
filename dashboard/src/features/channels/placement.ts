import { type FeatureKey } from "@testify/shared";

/** Placing a feature writes through its own route, so its validation and reach checks apply unchanged. */
export interface Placement {
	method: "patch" | "put";
	path: string;
	body: (channelId: string) => Record<string, unknown>;
}

/** The features a channel alone is enough to start; the rest need their own page, for a role or a message. */
export const PLACEMENTS = {
	welcome: { method: "patch", path: "/welcome", body: (channelId) => ({ channelId, enabled: true }) },
	goodbye: { method: "patch", path: "/goodbye", body: (channelId) => ({ channelId, enabled: true }) },
	birthdays: { method: "patch", path: "/birthdays", body: (channelId) => ({ channelId, enabled: true }) },
	ideas: { method: "patch", path: "/ideas", body: (channelId) => ({ channelId, enabled: true }) },
	starboard: { method: "patch", path: "/starboard", body: (channelId) => ({ channelId, enabled: true }) },
	counting: { method: "patch", path: "/settings/counting", body: (channelId) => ({ channelId, enabled: true }) },
	"temp-voice": {
		method: "patch",
		path: "/temp-voice",
		body: (channelId) => ({ lobbyChannelId: channelId, enabled: true }),
	},
	"bot-stats": { method: "put", path: "/bot-stats", body: (channelId) => ({ channelId }) },
} satisfies Partial<Record<FeatureKey, Placement>>;

export function placementOf(key: string): Placement | undefined {
	return (PLACEMENTS as Record<string, Placement | undefined>)[key];
}

/** The drag carries the feature and, in its type, the kind of channel it takes, since a drop target cannot read the data until the drop. */
export const DRAG_FEATURE = "application/x-testify-feature";

export function dragKindType(kind: "text" | "voice"): string {
	return `application/x-testify-accepts-${kind}`;
}
