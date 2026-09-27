import { model, Schema } from "mongoose";

export interface BlacklistEntry {
	userId: string;
	reason: string;
	createdAt: Date;
	updatedAt: Date;
}

const blacklistSchema = new Schema<BlacklistEntry>(
	{
		userId: { type: String, required: true, unique: true },
		reason: { type: String, required: true, default: "No reason provided" },
	},
	{ timestamps: true },
);

export const Blacklist = model<BlacklistEntry>("blacklist", blacklistSchema);

export interface WarnEdit {
	editedById: string;
	editedByTag: string;
	oldReason: string;
	newReason: string;
	editedAt: Date;
}

export interface WarnEntry {
	warnId: string;
	executorId: string;
	executorTag: string;
	reason: string;
	timestamp: Date;
	edits: WarnEdit[];
	/** The punishment step this warning triggered, absent on warnings from before punishments existed. */
	step?: string | null;
	/** Why that step could not be carried out, when it could not. */
	stepProblem?: string | null;
}

export interface WarnRecord {
	guildId: string;
	userId: string;
	userTag: string;
	warnings: WarnEntry[];
	createdAt: Date;
	updatedAt: Date;
}

const warnEditSchema = new Schema<WarnEdit>(
	{
		editedById: { type: String, required: true },
		editedByTag: { type: String, required: true },
		oldReason: { type: String, required: true },
		newReason: { type: String, required: true },
		editedAt: { type: Date, required: true, default: Date.now },
	},
	{ _id: false },
);

const warnEntrySchema = new Schema<WarnEntry>(
	{
		warnId: { type: String, required: true },
		executorId: { type: String, required: true },
		executorTag: { type: String, required: true },
		reason: { type: String, required: true, default: "No reason provided" },
		timestamp: { type: Date, required: true, default: Date.now },
		edits: { type: [warnEditSchema], required: true, default: [] },
		step: { type: String, default: null },
		stepProblem: { type: String, default: null },
	},
	{ _id: false },
);

const warnRecordSchema = new Schema<WarnRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		userTag: { type: String, required: true },
		warnings: { type: [warnEntrySchema], required: true, default: [] },
	},
	{ timestamps: true },
);

warnRecordSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const Warnings = model<WarnRecord>("warnTutorial", warnRecordSchema);

/** One per server: what its first, second and later warnings do, in order. */
export interface WarnLadderRecord {
	guildId: string;
	steps: { action: string; minutes?: number | null }[];
	lastModifiedBy: string;
	createdAt: Date;
	updatedAt: Date;
}

const warnLadderSchema = new Schema<WarnLadderRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		steps: {
			type: [new Schema({ action: { type: String, required: true }, minutes: { type: Number } }, { _id: false })],
			required: true,
			default: [],
		},
		lastModifiedBy: { type: String, required: true },
	},
	{ timestamps: true },
);

export const WarnLadderConfig = model<WarnLadderRecord>("warnpunishments", warnLadderSchema);

export interface SoftbanEntry {
	guildId: string;
	userId: string;
	moderatorId: string;
	reason: string;
	expiresAt: Date;
	isActive: boolean;
	deleteMessageSeconds: number;
	createdAt: Date;
	updatedAt: Date;
}

const softbanSchema = new Schema<SoftbanEntry>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		moderatorId: { type: String, required: true },
		reason: { type: String, required: true, default: "No reason provided" },
		expiresAt: { type: Date, required: true },
		isActive: { type: Boolean, required: true, default: true },
		deleteMessageSeconds: { type: Number, required: true, default: 0 },
	},
	{ timestamps: true },
);

softbanSchema.index({ guildId: 1, userId: 1, isActive: 1 });
softbanSchema.index({ isActive: 1, expiresAt: 1 });

export const Softban = model<SoftbanEntry>("SoftbanEntry", softbanSchema);

export interface DmLogEntry {
	messageId: string;
	authorId: string;
	content: string;
	hasAttachments: boolean;
	attachmentUrls: string[];
	createdAt: Date;
	updatedAt: Date;
}

const dmLogSchema = new Schema<DmLogEntry>(
	{
		messageId: { type: String, required: true, unique: true },
		authorId: { type: String, required: true },
		content: { type: String, required: true, default: "" },
		hasAttachments: { type: Boolean, required: true, default: false },
		attachmentUrls: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

dmLogSchema.index({ authorId: 1, createdAt: -1 });

export const DmLog = model<DmLogEntry>("DmLogger", dmLogSchema);
