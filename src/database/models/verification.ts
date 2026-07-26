import { model, Schema } from "mongoose";

export interface VerifySettings {
	guildId: string;
	channelId: string;
	roleId: string;
	messageId: string | null;
	verifiedIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

const verifySchema = new Schema<VerifySettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		roleId: { type: String, required: true },
		messageId: { type: String, default: null },
		verifiedIds: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

export const VerifyConfig = model<VerifySettings>("verify", verifySchema);

export interface PendingVerification {
	guildId: string;
	userId: string;
	code: string;
	createdAt: Date;
	updatedAt: Date;
}

const pendingSchema = new Schema<PendingVerification>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		code: { type: String, required: true },
	},
	{ timestamps: true },
);

pendingSchema.index({ guildId: 1, userId: 1 }, { unique: true });
// Pending codes are short-lived; Mongo evicts them so stale rows cannot accumulate.
pendingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export const PendingVerify = model<PendingVerification>("verifyusers", pendingSchema);
