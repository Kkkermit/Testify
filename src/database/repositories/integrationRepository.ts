import { decryptToken, encryptToken } from "../encryption";
import {
	InstagramNotification,
	type InstagramWatch,
	SpotifyUser,
	type SpotifyLink,
	ValorantUser,
	type ValorantLink,
} from "../models/integrations";
import { DmLog, type DmLogEntry } from "../models/moderation";
import { Profile, type UserProfile } from "../models/profile";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export interface SpotifyTokens {
	accessToken: string;
	refreshToken: string;
	tokenExpiry: Date;
}

export async function saveSpotifyTokens(
	discordId: string,
	tokens: SpotifyTokens,
	encryptionKey: string | undefined,
): Promise<void> {
	await SpotifyUser.findOneAndUpdate(
		{ discordId },
		{
			$set: {
				accessToken: encryptToken(tokens.accessToken, encryptionKey),
				refreshToken: encryptToken(tokens.refreshToken, encryptionKey),
				tokenExpiry: tokens.tokenExpiry,
			},
		},
		UPSERT,
	).exec();
}

export async function getSpotifyTokens(
	discordId: string,
	encryptionKey: string | undefined,
): Promise<SpotifyTokens | null> {
	const record = await SpotifyUser.findOne({ discordId }).lean<SpotifyLink>().exec();
	if (!record) return null;

	return {
		accessToken: decryptToken(record.accessToken, encryptionKey),
		refreshToken: decryptToken(record.refreshToken, encryptionKey),
		tokenExpiry: record.tokenExpiry,
	};
}

export async function deleteSpotifyLink(discordId: string): Promise<boolean> {
	return (await SpotifyUser.deleteOne({ discordId }).exec()).deletedCount > 0;
}

export interface ValorantTokens {
	accessToken: string;
	entitlementToken: string;
	userUuid: string;
	region: string;
	expiresAt: Date;
}

export async function saveValorantTokens(
	userId: string,
	tokens: ValorantTokens,
	encryptionKey: string | undefined,
): Promise<void> {
	await ValorantUser.findOneAndUpdate(
		{ userId },
		{
			$set: {
				accessToken: encryptToken(tokens.accessToken, encryptionKey),
				entitlementToken: encryptToken(tokens.entitlementToken, encryptionKey),
				userUuid: tokens.userUuid,
				region: tokens.region,
				expiresAt: tokens.expiresAt,
			},
		},
		UPSERT,
	).exec();
}

export async function getValorantTokens(
	userId: string,
	encryptionKey: string | undefined,
): Promise<ValorantTokens | null> {
	const record = await ValorantUser.findOne({ userId }).lean<ValorantLink>().exec();
	if (!record) return null;

	return {
		accessToken: decryptToken(record.accessToken, encryptionKey),
		entitlementToken: decryptToken(record.entitlementToken, encryptionKey),
		userUuid: record.userUuid,
		region: record.region,
		expiresAt: record.expiresAt,
	};
}

export async function deleteValorantLink(userId: string): Promise<boolean> {
	return (await ValorantUser.deleteOne({ userId }).exec()).deletedCount > 0;
}

export async function getInstagramWatch(guildId: string): Promise<InstagramWatch | null> {
	return InstagramNotification.findOne({ guildId }).lean<InstagramWatch>().exec();
}

export async function listInstagramWatches(): Promise<InstagramWatch[]> {
	return InstagramNotification.find().lean<InstagramWatch[]>().exec();
}

export async function addInstagramWatch(guildId: string, channelId: string, username: string): Promise<InstagramWatch> {
	return InstagramNotification.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId }, $addToSet: { usernames: username.toLowerCase() } },
		UPSERT,
	).exec() as Promise<InstagramWatch>;
}

export async function removeInstagramWatch(guildId: string, username: string): Promise<InstagramWatch | null> {
	return InstagramNotification.findOneAndUpdate(
		{ guildId },
		{ $pull: { usernames: username.toLowerCase() } },
		{ new: true, lean: true },
	)
		.lean<InstagramWatch>()
		.exec();
}

export async function setInstagramLastPost(guildId: string, username: string, at: Date): Promise<void> {
	await InstagramNotification.updateOne(
		{ guildId },
		{ $set: { [`lastPostDates.${username.toLowerCase()}`]: at } },
	).exec();
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
	return Profile.findOne({ userId }).lean<UserProfile>().exec();
}

export async function saveProfile(
	userId: string,
	fields: Partial<Omit<UserProfile, "userId" | "createdAt" | "updatedAt">>,
): Promise<UserProfile> {
	return Profile.findOneAndUpdate({ userId }, { $set: fields }, UPSERT).exec() as Promise<UserProfile>;
}

export async function deleteProfile(userId: string): Promise<boolean> {
	return (await Profile.deleteOne({ userId }).exec()).deletedCount > 0;
}

export async function logDirectMessage(entry: {
	messageId: string;
	authorId: string;
	content: string;
	attachmentUrls: string[];
}): Promise<void> {
	await DmLog.updateOne(
		{ messageId: entry.messageId },
		{
			$set: {
				authorId: entry.authorId,
				content: entry.content,
				hasAttachments: entry.attachmentUrls.length > 0,
				attachmentUrls: entry.attachmentUrls,
			},
		},
		{ upsert: true, setDefaultsOnInsert: true },
	).exec();
}

export async function listDirectMessages(authorId: string, limit = 25): Promise<DmLogEntry[]> {
	return DmLog.find({ authorId }).sort({ createdAt: -1 }).limit(limit).lean<DmLogEntry[]>().exec();
}
