import { model, Schema } from "mongoose";
import { APPEAL_LIMITS, APPEAL_STATUSES, type AppealStatus } from "@testify/shared";

/** Whether a server takes ban appeals, where staff are shown them, and how long a refusal holds back the next. */
export interface AppealSettingsRecord {
	guildId: string;
	enabled: boolean;
	channelId: string | null;
	cooldownDays: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const appealSettingsSchema = new Schema<AppealSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		channelId: { type: String, default: null },
		cooldownDays: { type: Number, required: true, default: APPEAL_LIMITS.defaultCooldownDays },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const AppealSettingsConfig = model<AppealSettingsRecord>("appealsettings", appealSettingsSchema);

/** One banned member's appeal to one server, and what staff decided. */
export interface AppealRecord {
	guildId: string;
	userId: string;
	/** Kept because somebody banned can no longer be looked up as a member. */
	username: string;
	text: string;
	status: AppealStatus;
	reason: string;
	decidedBy: string | null;
	decidedByName: string | null;
	decidedAt: Date | null;
	channelId: string | null;
	messageId: string | null;
	/** Set once it is decided, so MongoDB deletes it `APPEAL_LIMITS.keepDays` later. */
	expiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const appealSchema = new Schema<AppealRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		text: { type: String, required: true },
		status: { type: String, enum: APPEAL_STATUSES, required: true, default: "open" },
		reason: { type: String, default: "" },
		decidedBy: { type: String, default: null },
		decidedByName: { type: String, default: null },
		decidedAt: { type: Date, default: null },
		channelId: { type: String, default: null },
		messageId: { type: String, default: null },
		expiresAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

// One appeal waiting per person per server, so two sent at once cannot both land.
appealSchema.index({ guildId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: "open" } });
appealSchema.index({ guildId: 1, status: 1, createdAt: -1 });
appealSchema.index({ userId: 1, createdAt: -1 });
appealSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Appeal = model<AppealRecord>("appeals", appealSchema);
