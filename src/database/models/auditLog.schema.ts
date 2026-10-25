import { model, Schema } from "mongoose";

export interface AuditLogSettings {
	guildId: string;
	channelId: string;
	enabledLogs: string[];
	createdAt: Date;
	updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		enabledLogs: { type: [String], required: true, default: ["all"] },
	},
	{ timestamps: true },
);

export const AuditLogConfig = model<AuditLogSettings>("AuditLogs", auditLogSchema);
