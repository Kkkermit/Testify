import { model, Schema } from "mongoose";

/**
 * Third-party OAuth tokens are stored encrypted (see `database/encryption.ts`).
 * The previous schemas wrote Spotify and Riot tokens in plaintext, so anyone with
 * database read access could act as those users.
 */

export interface SpotifyLink {
	discordId: string;
	accessToken: string;
	refreshToken: string;
	tokenExpiry: Date;
	createdAt: Date;
	updatedAt: Date;
}

const spotifySchema = new Schema<SpotifyLink>(
	{
		discordId: { type: String, required: true, unique: true },
		accessToken: { type: String, required: true },
		refreshToken: { type: String, required: true },
		tokenExpiry: { type: Date, required: true },
	},
	{ timestamps: true },
);

export const SpotifyUser = model<SpotifyLink>("SpotifyUser", spotifySchema);

export interface ValorantLink {
	userId: string;
	accessToken: string;
	entitlementToken: string;
	userUuid: string;
	region: string;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const valorantSchema = new Schema<ValorantLink>(
	{
		userId: { type: String, required: true, unique: true },
		accessToken: { type: String, required: true },
		entitlementToken: { type: String, required: true },
		userUuid: { type: String, required: true },
		region: { type: String, required: true, default: "eu" },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

valorantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604_800 });

export const ValorantUser = model<ValorantLink>("ValorantUser", valorantSchema);

export interface InstagramWatch {
	guildId: string;
	channelId: string;
	usernames: string[];
	/** Mongoose stores this as a Map; `.lean()` reads hand back a plain object. */
	lastPostDates: Record<string, Date>;
	createdAt: Date;
	updatedAt: Date;
}

const instagramSchema = new Schema<InstagramWatch>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		usernames: { type: [String], required: true, default: [] },
		lastPostDates: { type: Map, of: Date, required: true, default: (): Record<string, Date> => ({}) },
	},
	{ timestamps: true },
);

export const InstagramNotification = model<InstagramWatch>("InstagramNotifications", instagramSchema);
