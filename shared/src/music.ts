import { z } from "zod";
import { snowflake } from "./schemas";

/** The music system's per-server settings: whether it runs at all, and who is allowed to drive it. */

export const MUSIC_LIMITS = {
	/** Discord's own cap on a role select, which is what the Discord panel uses to edit this. */
	maxDjRoles: 25,
} as const;

export interface MusicSettings {
	enabled: boolean;
	/** Empty means anybody may use the player; otherwise a member needs one of these roles. */
	djRoleIds: string[];
	/** False while the guild has no record, so a page can say the settings shown are only defaults. */
	configured: boolean;
}

export const musicPatch = z
	.object({
		enabled: z.boolean(),
		djRoleIds: z.array(snowflake).max(MUSIC_LIMITS.maxDjRoles),
	})
	.partial();

export type MusicPatch = z.infer<typeof musicPatch>;
