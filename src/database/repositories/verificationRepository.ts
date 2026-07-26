import { randomInt } from "node:crypto";
import { type PendingVerification, PendingVerify, VerifyConfig, type VerifySettings } from "../models/verification";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
	let code = "";
	for (let index = 0; index < length; index += 1) {
		code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
	}
	return code;
}

export async function getVerifyConfig(guildId: string): Promise<VerifySettings | null> {
	return VerifyConfig.findOne({ guildId }).lean<VerifySettings>().exec();
}

export async function saveVerifyConfig(
	guildId: string,
	fields: Partial<Omit<VerifySettings, "guildId" | "createdAt" | "updatedAt">>,
): Promise<VerifySettings> {
	return VerifyConfig.findOneAndUpdate({ guildId }, { $set: fields }, UPSERT).exec() as Promise<VerifySettings>;
}

export async function deleteVerifyConfig(guildId: string): Promise<boolean> {
	await PendingVerify.deleteMany({ guildId }).exec();
	return (await VerifyConfig.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function markVerified(guildId: string, userId: string): Promise<void> {
	await VerifyConfig.updateOne({ guildId }, { $addToSet: { verifiedIds: userId } }).exec();
	await PendingVerify.deleteOne({ guildId, userId }).exec();
}

export async function isVerified(guildId: string, userId: string): Promise<boolean> {
	return (await VerifyConfig.exists({ guildId, verifiedIds: userId })) !== null;
}

export async function issueCode(guildId: string, userId: string): Promise<string> {
	const code = generateCode();
	await PendingVerify.findOneAndUpdate({ guildId, userId }, { $set: { code, createdAt: new Date() } }, UPSERT).exec();
	return code;
}

export async function getPendingCode(guildId: string, userId: string): Promise<PendingVerification | null> {
	return PendingVerify.findOne({ guildId, userId }).lean<PendingVerification>().exec();
}
