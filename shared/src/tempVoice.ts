import { z } from "zod";
import { snowflake } from "./schemas";
import { plainLine } from "./text";

/** Joining a server's lobby voice channel makes the joiner a channel of their own, deleted once it empties. */

export const TEMP_VOICE_LIMITS = {
	maxTemplate: 60,
	/** Discord's own cap on a voice channel's user limit. */
	maxUserLimit: 99,
	defaultTemplate: "{user}'s channel",
} as const;

/** What a lobby made from the panel or the dashboard is called. */
export const TEMP_VOICE_LOBBY_NAME = "➕ New channel";

export interface TempVoiceSettings {
	enabled: boolean;
	lobbyChannelId: string | null;
	/** Where new channels go; null puts them beside the lobby. */
	categoryId: string | null;
	nameTemplate: string;
	/** Zero for no limit. */
	userLimit: number;
	/** False when the bot lacks Manage Channels or Move Members, without which nothing can be made. */
	canManage: boolean;
	/** How many made channels are open right now. */
	active: number;
}

export const tempVoicePatch = z
	.object({
		enabled: z.boolean().optional(),
		lobbyChannelId: snowflake.nullable().optional(),
		categoryId: snowflake.nullable().optional(),
		nameTemplate: plainLine(1, TEMP_VOICE_LIMITS.maxTemplate).optional(),
		userLimit: z.number().int().min(0).max(TEMP_VOICE_LIMITS.maxUserLimit).optional(),
	})
	.refine((patch) => Object.values(patch).some((value) => value !== undefined), "nothing to change");

export type TempVoicePatch = z.infer<typeof tempVoicePatch>;

/** `{user}` becomes the joiner's name; Discord caps a channel name at 100 characters, and never leaves one empty. */
export function tempChannelName(template: string, displayName: string): string {
	const name = template.replaceAll("{user}", displayName).trim().slice(0, 100);
	return name === "" ? `${displayName.slice(0, 90)}'s channel` : name;
}
