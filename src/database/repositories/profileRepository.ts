import { DmLog, type DmLogEntry } from "@database/models/moderation";
import { Profile, type UserProfile } from "@database/models/profile";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

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
