import { model, Schema } from "mongoose";
import { CASE_ACTIONS, type CaseAction } from "@testify/shared";

/** One moderation action, numbered within its server. */
export interface ModCaseRecord {
	guildId: string;
	number: number;
	action: CaseAction;
	userId: string;
	username: string;
	moderatorId: string;
	moderatorName: string;
	reason: string;
	durationMs: number | null;
	createdAt: Date;
	updatedAt: Date;
}

/** The last number given out, kept apart from the settings so leaving a server cannot reuse one. */
export interface ModCaseCounterRecord {
	guildId: string;
	last: number;
}

/** Where a server's cases are posted. */
export interface ModCaseSettingsRecord {
	guildId: string;
	logChannelId: string | null;
	updatedBy: string | null;
}

const caseSchema = new Schema<ModCaseRecord>(
	{
		guildId: { type: String, required: true },
		number: { type: Number, required: true },
		action: { type: String, enum: CASE_ACTIONS, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		moderatorId: { type: String, required: true },
		moderatorName: { type: String, required: true },
		reason: { type: String, required: true },
		durationMs: { type: Number, default: null },
	},
	{ timestamps: true },
);

caseSchema.index({ guildId: 1, number: 1 }, { unique: true });
caseSchema.index({ guildId: 1, userId: 1 });
caseSchema.index({ guildId: 1, createdAt: -1 });

const counterSchema = new Schema<ModCaseCounterRecord>({
	guildId: { type: String, required: true, unique: true },
	last: { type: Number, default: 0 },
});

const settingsSchema = new Schema<ModCaseSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		logChannelId: { type: String, default: null },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const ModCaseEntry = model<ModCaseRecord>("modcases", caseSchema);
export const ModCaseCounter = model<ModCaseCounterRecord>("modcasecounters", counterSchema);
export const ModCaseSettings = model<ModCaseSettingsRecord>("modcasesettings", settingsSchema);
