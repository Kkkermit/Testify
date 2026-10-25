import { model, Schema } from "mongoose";

export interface UserLevelRecord {
	guildId: string;
	userId: string;
	xp: number;
	level: number;
	lastMessageAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const userLevelSchema = new Schema<UserLevelRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		xp: { type: Number, required: true, default: 0 },
		level: { type: Number, required: true, default: 0 },
		lastMessageAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, level: -1, xp: -1, _id: 1 });

export const UserLevel = model<UserLevelRecord>("UserLevel", userLevelSchema);

/** A role whose holders earn more XP per message. */
export interface XpBoost {
	roleId: string;
	multiplier: number;
}

/** A role handed out on reaching a level. */
export interface LevelReward {
	level: number;
	roleId: string;
}

export interface LevelSettings {
	guildId: string;
	isDisabled: boolean;
	/** Still read so an existing guild keeps its multiplier, but nothing writes it any more — `boosts` does. */
	roleId: string | null;
	multiplier: number;
	boosts: XpBoost[];
	rewards: LevelReward[];
	/** Keep every reward earned so far, rather than only the newest one. */
	stackRewards: boolean;
	levelUpChannelId: string | null;
	/** Announce level-ups at all. */
	announce: boolean;
	ignoredChannelIds: string[];
	ignoredRoleIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

const xpBoostSchema = new Schema<XpBoost>(
	{
		roleId: { type: String, required: true },
		multiplier: { type: Number, required: true, default: 2 },
	},
	{ _id: false },
);

const levelRewardSchema = new Schema<LevelReward>(
	{
		level: { type: Number, required: true },
		roleId: { type: String, required: true },
	},
	{ _id: false },
);

const levelSettingsSchema = new Schema<LevelSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		isDisabled: { type: Boolean, required: true, default: false },
		roleId: { type: String, default: null },
		multiplier: { type: Number, required: true, default: 1 },
		boosts: { type: [xpBoostSchema], required: true, default: [] },
		rewards: { type: [levelRewardSchema], required: true, default: [] },
		stackRewards: { type: Boolean, required: true, default: true },
		levelUpChannelId: { type: String, default: null },
		announce: { type: Boolean, required: true, default: true },
		ignoredChannelIds: { type: [String], required: true, default: [] },
		ignoredRoleIds: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

export const LevelConfig = model<LevelSettings>("levelsetup", levelSettingsSchema);
