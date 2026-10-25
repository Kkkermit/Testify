import { AuditLogConfig, type AuditLogSettings } from "@database/models/auditLog.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getAuditLogConfig(guildId: string): Promise<AuditLogSettings | null> {
	return AuditLogConfig.findOne({ guildId }).lean<AuditLogSettings>().exec();
}

export async function setAuditLogConfig(
	guildId: string,
	channelId: string,
	enabledLogs: string[],
): Promise<AuditLogSettings> {
	return AuditLogConfig.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, enabledLogs } },
		UPSERT,
	).exec() as Promise<AuditLogSettings>;
}

export async function disableAuditLog(guildId: string): Promise<boolean> {
	return (await AuditLogConfig.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function purgeAuditLog(guildId: string): Promise<void> {
	await AuditLogConfig.deleteMany({ guildId }).exec();
}
