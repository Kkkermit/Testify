import { type Types } from "mongoose";
import {
	TempChannel,
	type TempChannelRecord,
	TempVoiceSettingsConfig,
	type TempVoiceSettingsRecord,
} from "@database/models/tempVoice.schema";

export type StoredTempVoiceSettings = Pick<
	TempVoiceSettingsRecord,
	"enabled" | "lobbyChannelId" | "categoryId" | "nameTemplate" | "userLimit"
>;

export type StoredTempChannel = Pick<TempChannelRecord, "guildId" | "channelId" | "ownerId">;

type Lean = TempChannelRecord & { _id: Types.ObjectId };

const SETTINGS_FIELDS = "enabled lobbyChannelId categoryId nameTemplate userLimit";

function toChannel(row: Lean): StoredTempChannel {
	return { guildId: row.guildId, channelId: row.channelId, ownerId: row.ownerId };
}

export async function getTempVoiceSettings(guildId: string): Promise<StoredTempVoiceSettings | null> {
	return TempVoiceSettingsConfig.findOne({ guildId }).select(SETTINGS_FIELDS).lean<StoredTempVoiceSettings>().exec();
}

export async function saveTempVoiceSettings(
	guildId: string,
	changes: Partial<StoredTempVoiceSettings>,
	updatedBy: string | null,
): Promise<StoredTempVoiceSettings> {
	return TempVoiceSettingsConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { ...changes, updatedBy } },
		{ upsert: true, new: true, setDefaultsOnInsert: true },
	)
		.select(SETTINGS_FIELDS)
		.lean<StoredTempVoiceSettings>()
		.exec();
}

export async function recordTempChannel(channel: StoredTempChannel): Promise<void> {
	await TempChannel.create(channel);
}

export async function findTempChannel(guildId: string, channelId: string): Promise<StoredTempChannel | null> {
	const row = await TempChannel.findOne({ guildId, channelId }).lean<Lean>().exec();
	return row === null ? null : toChannel(row);
}

/** The channel somebody already has, so a second trip through the lobby goes back to it rather than making another. */
export async function findOwnedTempChannel(guildId: string, ownerId: string): Promise<StoredTempChannel | null> {
	const row = await TempChannel.findOne({ guildId, ownerId }).sort({ createdAt: -1 }).lean<Lean>().exec();
	return row === null ? null : toChannel(row);
}

export async function forgetTempChannel(guildId: string, channelId: string): Promise<boolean> {
	const result = await TempChannel.deleteOne({ guildId, channelId }).exec();
	return result.deletedCount > 0;
}

/** Every made channel the bot knows of, in every server, for the sweep that tidies up after a restart. */
export async function listTempChannels(limit: number): Promise<StoredTempChannel[]> {
	const rows = await TempChannel.find().sort({ createdAt: 1 }).limit(limit).lean<Lean[]>().exec();
	return rows.map(toChannel);
}

export async function countTempChannels(guildId: string): Promise<number> {
	return TempChannel.countDocuments({ guildId }).exec();
}

export async function purgeTempVoice(guildId: string): Promise<void> {
	await Promise.all([
		TempChannel.deleteMany({ guildId }).exec(),
		TempVoiceSettingsConfig.deleteMany({ guildId }).exec(),
	]);
}
