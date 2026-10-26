import { z } from "zod";
import { snowflake } from "./schemas";
import { plainLine, plainText } from "./text";

/** A message posted as the bot, from `/announce` or the dashboard's composer. Nobody is pinged unless it says so. */

export const ANNOUNCEMENT_LIMITS = {
	/** Discord's limit on an embed's title. */
	maxTitle: 256,
	maxMessage: 2_000,
} as const;

/** The colours `/announce` offers, by name. */
export const EMBED_COLOURS = [
	{ name: "Aqua", value: "#00ffff" },
	{ name: "Blurple", value: "#7289da" },
	{ name: "Blue", value: "#0000ff" },
	{ name: "Fuchsia", value: "#ff00ff" },
	{ name: "Gold", value: "#ffd700" },
	{ name: "Green", value: "#008000" },
	{ name: "Grey", value: "#808080" },
	{ name: "Navy", value: "#000080" },
	{ name: "Orange", value: "#ffa500" },
	{ name: "Pink", value: "#ff007f" },
	{ name: "Purple", value: "#800080" },
	{ name: "Red", value: "#ff0000" },
	{ name: "White", value: "#ffffff" },
	{ name: "Yellow", value: "#ffff00" },
] as const;

export type EmbedColour = (typeof EMBED_COLOURS)[number]["value"];

export const ANNOUNCEMENT_STYLES = ["text", "embed"] as const;

export type AnnouncementStyle = (typeof ANNOUNCEMENT_STYLES)[number];

/** Pinging anybody is a choice made on purpose, and none is where every form starts. */
export const ANNOUNCEMENT_MENTIONS = ["none", "everyone", "here"] as const;

export type AnnouncementMentions = (typeof ANNOUNCEMENT_MENTIONS)[number];

const colourValues = EMBED_COLOURS.map((colour) => colour.value) as [EmbedColour, ...EmbedColour[]];

export const announcementBody = z.object({
	channelId: snowflake,
	style: z.enum(ANNOUNCEMENT_STYLES),
	title: plainLine(1, ANNOUNCEMENT_LIMITS.maxTitle).optional(),
	message: plainText(1, ANNOUNCEMENT_LIMITS.maxMessage),
	colour: z.enum(colourValues).optional(),
	mentions: z.enum(ANNOUNCEMENT_MENTIONS).default("none"),
});

export type AnnouncementBody = z.input<typeof announcementBody>;

export interface AnnouncementSent {
	channelId: string;
	url: string;
}
