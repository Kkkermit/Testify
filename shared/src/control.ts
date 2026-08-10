import { z } from "zod";
import { plainLine } from "./text";

/**
 * What the bot owner can do to the running bot from a browser.
 *
 * There is no "start", and that is a property of the design rather than an omission: the dashboard's HTTP
 * server runs *inside* the bot process, so a stopped bot has nothing left to serve a start button. What is
 * possible is disconnecting from Discord while the process keeps running, which is what `paused` means here.
 */

export type GatewayState = "online" | "paused" | "connecting";

export interface BotControlState {
	gateway: GatewayState;
	/** Present once the bot has been online at least once in this process. */
	since: string | null;
	guilds: number;
	/** Websocket round trip in milliseconds, or null while disconnected. */
	pingMs: number | null;
}

export const gatewayAction = z.object({ action: z.enum(["pause", "resume"]) });

export type GatewayAction = z.infer<typeof gatewayAction>;

/**
 * Shutting the process down ends the dashboard with it, so it is typed rather than clicked — the same shape as
 * every other confirmation that cannot be undone from the screen that started it.
 */
export const shutdownRequest = z.object({ confirm: z.literal("shut down") });

export const BOT_IDENTITY_LIMITS = { minUsername: 2, maxUsername: 32, maxAvatarBytes: 8 * 1024 * 1024 } as const;

/**
 * The bot's global profile. Discord has no per-guild avatar for bots, so this is application-wide and belongs
 * to the owner rather than to a server manager.
 */
export const botIdentityPatch = z
	.object({
		username: plainLine(BOT_IDENTITY_LIMITS.minUsername, BOT_IDENTITY_LIMITS.maxUsername),
		/** A data URI. Rejected here rather than at Discord, so the error names the real problem. */
		avatar: z
			.string()
			.regex(/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/, "must be a PNG, JPEG, GIF or WebP image")
			.max(BOT_IDENTITY_LIMITS.maxAvatarBytes * 2),
	})
	.partial()
	.refine((patch) => Object.keys(patch).length > 0, "must change something");

export type BotIdentityPatch = z.infer<typeof botIdentityPatch>;

export const NICKNAME_MAX = 32;

/** Per-guild, and the one piece of the bot's appearance a server manager may change. */
// Null clears it; an empty string is the same intent typed rather than clicked, so it is folded into null.
export const nicknamePatch = z.object({
	nickname: plainLine(0, NICKNAME_MAX)
		.transform((value) => (value === "" ? null : value))
		.nullable(),
});

export type NicknamePatch = z.infer<typeof nicknamePatch>;

export interface GuildNickname {
	nickname: string | null;
	/** False when the bot lacks Change Nickname, so the form explains rather than failing on save. */
	canChange: boolean;
}

export interface OwnerGuildDetail {
	id: string;
	name: string;
	iconUrl: string | null;
	memberCount: number;
	channelCount: number;
	roleCount: number;
	/** Null when Discord has not told us, which happens for a guild joined before this process started. */
	joinedAt: string | null;
	createdAt: string;
	ownerId: string;
	/** The bot's own nickname and top role position in that server. */
	nickname: string | null;
	highestRole: string | null;
	missingPermissions: string[];
	configured: string[];
	/** Commands run there in the last 30 days. */
	usage: number;
}
