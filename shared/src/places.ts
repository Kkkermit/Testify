import { type FeatureStatus } from "./api";

/** Where each feature works in a server, which the dashboard draws as a map of the server's own channels. */

/** What a feature does in a channel: posts there, logs there, keeps a panel there, uses it as a lobby, names it with a count, or reads what is typed there. */
export const PLACE_ROLES = ["posts", "logs", "panel", "lobby", "counter", "listens"] as const;
export type PlaceRole = (typeof PLACE_ROLES)[number];

export interface Place {
	channelId: string;
	role: PlaceRole;
}

/** "channel" works in one channel chosen for it, "many" in any number added one at a time, "everywhere" across the server. */
export type PlaceReach = "channel" | "many" | "everywhere";

/** A text channel, announcement channels included, or a voice channel. */
export type PlaceKind = "text" | "voice";

/** Only a feature that lives in a chosen channel can be placed in one, and it takes one kind of channel. */
export type PlaceRule = { reach: "everywhere" } | { reach: "channel" | "many"; accepts: PlaceKind };

export const FEATURE_PLACES = {
	levelling: { reach: "everywhere" },
	"audit-logging": { reach: "channel", accepts: "text" },
	welcome: { reach: "channel", accepts: "text" },
	goodbye: { reach: "channel", accepts: "text" },
	birthdays: { reach: "channel", accepts: "text" },
	verification: { reach: "channel", accepts: "text" },
	cases: { reach: "everywhere" },
	"raid-protection": { reach: "everywhere" },
	"anti-link": { reach: "everywhere" },
	counting: { reach: "channel", accepts: "text" },
	"auto-roles": { reach: "everywhere" },
	"role-menus": { reach: "many", accepts: "text" },
	ideas: { reach: "channel", accepts: "text" },
	starboard: { reach: "channel", accepts: "text" },
	"temp-voice": { reach: "channel", accepts: "voice" },
	"voice-stats": { reach: "everywhere" },
	sticky: { reach: "many", accepts: "text" },
	"auto-responders": { reach: "everywhere" },
	"scheduled-messages": { reach: "many", accepts: "text" },
	treasure: { reach: "everywhere" },
	tickets: { reach: "channel", accepts: "text" },
	lottery: { reach: "everywhere" },
	casino: { reach: "everywhere" },
	"bot-stats": { reach: "channel", accepts: "text" },
} as const satisfies Record<string, PlaceRule>;

export type FeatureKey = keyof typeof FEATURE_PLACES;

/** A feature's overview reading, where it works, and whether it can be placed and in what. */
export type FeaturePlaces = FeatureStatus & {
	reach: PlaceReach;
	accepts: PlaceKind | null;
	/** Every channel it uses, whether or not it is switched on, so a switched-off feature still shows where it was. */
	places: Place[];
};

export interface GuildPlaces {
	features: FeaturePlaces[];
}

/** A feature that needs a channel and has none yet, which the map shows as waiting to be placed. */
export function isWaiting(feature: Pick<FeaturePlaces, "reach" | "places">): boolean {
	return feature.reach === "channel" && feature.places.length === 0;
}
