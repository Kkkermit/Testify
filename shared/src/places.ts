import { type FeatureStatus } from "./api";

export const PLACE_ROLES = ["posts", "logs", "panel", "lobby", "counter", "listens"] as const;
export type PlaceRole = (typeof PLACE_ROLES)[number];

export interface Place {
	channelId: string;
	role: PlaceRole;
}

/** "channel" works in one channel chosen for it, "many" in any number added one at a time, "everywhere" across the server. */
export type PlaceReach = "channel" | "many" | "everywhere";

export interface PlaceRule {
	reach: PlaceReach;
}

export const FEATURE_PLACES = {
	levelling: { reach: "everywhere" },
	"audit-logging": { reach: "channel" },
	welcome: { reach: "channel" },
	goodbye: { reach: "channel" },
	birthdays: { reach: "channel" },
	verification: { reach: "channel" },
	cases: { reach: "everywhere" },
	"raid-protection": { reach: "everywhere" },
	"anti-link": { reach: "everywhere" },
	counting: { reach: "channel" },
	"auto-roles": { reach: "everywhere" },
	"role-menus": { reach: "many" },
	ideas: { reach: "channel" },
	starboard: { reach: "channel" },
	"temp-voice": { reach: "channel" },
	"voice-stats": { reach: "everywhere" },
	sticky: { reach: "many" },
	"auto-responders": { reach: "everywhere" },
	"scheduled-messages": { reach: "many" },
	treasure: { reach: "everywhere" },
	tickets: { reach: "channel" },
	lottery: { reach: "everywhere" },
	casino: { reach: "everywhere" },
	"bot-stats": { reach: "channel" },
} as const satisfies Record<string, PlaceRule>;

export type FeatureKey = keyof typeof FEATURE_PLACES;

export type FeaturePlaces = FeatureStatus & {
	reach: PlaceReach;
	/** Every channel it uses, whether or not it is switched on, so a switched-off feature still shows where it was. */
	places: Place[];
};

export interface GuildPlaces {
	features: FeaturePlaces[];
}
