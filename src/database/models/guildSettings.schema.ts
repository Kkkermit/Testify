import { model, Schema } from "mongoose";
import { COUNTING_DEFAULT_MAX, DEFAULT_PREFIX } from "@config/constants";

export interface PrefixSettings {
	guildId: string;
	prefix: string;
	/** Prefix commands can be switched off per server; slash commands always work. */
	isEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const prefixSchema = new Schema<PrefixSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		prefix: { type: String, required: true, default: DEFAULT_PREFIX },
		isEnabled: { type: Boolean, required: true, default: true },
	},
	{ timestamps: true },
);

export const GuildPrefix = model<PrefixSettings>("prefix", prefixSchema);

export interface AntiLinkSettings {
	guildId: string;
	/** Permission flag name a member needs to be allowed to post links. */
	bypassPermission: string;
	createdAt: Date;
	updatedAt: Date;
}

const antiLinkSchema = new Schema<AntiLinkSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		bypassPermission: { type: String, required: true, default: "ManageMessages" },
	},
	{ timestamps: true },
);

export const AntiLink = model<AntiLinkSettings>("links", antiLinkSchema);

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

export interface AutoRoleSettings {
	guildId: string;
	roleIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

const autoRoleSchema = new Schema<AutoRoleSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		roleIds: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

export const AutoRole = model<AutoRoleSettings>("autoRoles1742", autoRoleSchema);

export interface CountingSettings {
	guildId: string;
	channelId: string;
	count: number;
	maxCount: number;
	lastUserId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const countingSchema = new Schema<CountingSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		maxCount: { type: Number, required: true, default: COUNTING_DEFAULT_MAX },
		lastUserId: { type: String, default: null },
	},
	{ timestamps: true },
);

export const Counting = model<CountingSettings>("countingSchema", countingSchema);

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
	/**
	 * The single boost role the first version supported. Still read so an existing
	 * guild keeps its multiplier, but nothing writes it any more — `boosts` does.
	 */
	roleId: string | null;
	multiplier: number;
	boosts: XpBoost[];
	rewards: LevelReward[];
	/** Keep every reward earned so far, rather than only the newest one. */
	stackRewards: boolean;
	levelUpChannelId: string | null;
	/** Announce level-ups at all. Off still awards XP, it just says nothing. */
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

export interface StickyMessage {
	guildId: string;
	channelId: string;
	message: string;
	count: number;
	cap: number;
	lastMessageId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const stickySchema = new Schema<StickyMessage>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		message: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		cap: { type: Number, required: true, default: 5 },
		lastMessageId: { type: String, default: null },
	},
	{ timestamps: true },
);

stickySchema.index({ guildId: 1, channelId: 1 }, { unique: true });

export const Sticky = model<StickyMessage>("stickyschema", stickySchema);

export interface WelcomeSettings {
	guildId: string;
	channelId: string;
	message: string;
	isEmbed: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const welcomeSchema = new Schema<WelcomeSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		message: { type: String, required: true },
		isEmbed: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true },
);

export const Welcome = model<WelcomeSettings>("WelcomeMessage", welcomeSchema);

export interface VoiceCounterSettings {
	guildId: string;
	memberChannelId: string | null;
	botChannelId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const voiceCounterSchema = new Schema<VoiceCounterSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		memberChannelId: { type: String, default: null },
		botChannelId: { type: String, default: null },
	},
	{ timestamps: true },
);

export const VoiceCounter = model<VoiceCounterSettings>("voiceChannelSchema", voiceCounterSchema);

export interface FixedStatsMessage {
	guildId: string;
	channelId: string;
	messageId: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

const fixedStatsSchema = new Schema<FixedStatsMessage>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		messageId: { type: String, required: true },
		userId: { type: String, required: true },
	},
	{ timestamps: true },
);

export const FixedStats = model<FixedStatsMessage>("guildChannelSchema", fixedStatsSchema);

export interface TreasureConfigSettings {
	guildId: string;
	isEnabled: boolean;
	minMessages: number;
	maxMessages: number;
	minAmount: number;
	maxAmount: number;
	cooldownMs: number;
	createdBy: string;
	lastModifiedBy: string;
	createdAt: Date;
	updatedAt: Date;
}

const treasureSchema = new Schema<TreasureConfigSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		isEnabled: { type: Boolean, required: true, default: true },
		minMessages: { type: Number, required: true, default: 15 },
		maxMessages: { type: Number, required: true, default: 50 },
		minAmount: { type: Number, required: true, default: 10 },
		maxAmount: { type: Number, required: true, default: 500 },
		cooldownMs: { type: Number, required: true, default: 300_000 },
		createdBy: { type: String, required: true },
		lastModifiedBy: { type: String, required: true },
	},
	{ timestamps: true },
);

export const TreasureConfig = model<TreasureConfigSettings>("TreasureConfig", treasureSchema);
