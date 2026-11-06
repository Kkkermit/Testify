import { model, Schema } from "mongoose";

/** Where a server's mod mail threads are made, who is pinged when one opens and how staff replies are signed. */
export interface ModmailSettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	pingRoleId: string | null;
	anonymous: boolean;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const modmailSettingsSchema = new Schema<ModmailSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		channelId: { type: String, default: null },
		pingRoleId: { type: String, default: null },
		anonymous: { type: Boolean, required: true, default: false },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const ModmailSettingsConfig = model<ModmailSettingsRecord>("modmailsettings", modmailSettingsSchema);

export const MODMAIL_STATUSES = ["open", "closed"] as const;

/** One member's conversation with one server's staff; what either side wrote is only in Discord. */
export interface ModmailThreadRecord {
	guildId: string;
	userId: string;
	/** Kept so the dashboard can name somebody who has since left. */
	username: string;
	/** Null only between the claim and the thread being made. */
	threadId: string | null;
	status: (typeof MODMAIL_STATUSES)[number];
	waiting: boolean;
	lastMessageAt: Date;
	closedAt: Date | null;
	closedBy: string | null;
	/** Set once it closes, so MongoDB deletes it `MODMAIL_LIMITS.keepDays` later. */
	expiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const modmailThreadSchema = new Schema<ModmailThreadRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		threadId: { type: String, default: null },
		status: { type: String, enum: MODMAIL_STATUSES, required: true, default: "open" },
		waiting: { type: Boolean, required: true, default: true },
		lastMessageAt: { type: Date, required: true, default: () => new Date() },
		closedAt: { type: Date, default: null },
		closedBy: { type: String, default: null },
		expiresAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

// A direct message goes to the one conversation its sender has open, so there can only be one, across every server.
modmailThreadSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: "open" } });
modmailThreadSchema.index(
	{ threadId: 1 },
	{ unique: true, partialFilterExpression: { threadId: { $type: "string" } } },
);
modmailThreadSchema.index({ guildId: 1, status: 1, lastMessageAt: -1 });
modmailThreadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ModmailThread = model<ModmailThreadRecord>("modmailthreads", modmailThreadSchema);
