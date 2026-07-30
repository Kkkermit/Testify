import { CACHE, DEFAULT_PREFIX } from "@config/constants";
import {
	AntiLink,
	type AntiLinkSettings,
	AuditLogConfig,
	type AuditLogSettings,
	AutoRole,
	type AutoRoleSettings,
	Counting,
	type CountingSettings,
	FixedStats,
	type FixedStatsMessage,
	Sticky,
	type StickyMessage,
	TreasureConfig,
	type TreasureConfigSettings,
	VoiceCounter,
	type VoiceCounterSettings,
	Welcome,
	type WelcomeSettings,
	GuildPrefix,
	type PrefixSettings,
} from "@database/models/guildSettings.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

/**
 * Prefixes are read on every single message, so they are cached. The cache is
 * per-process and short-lived, which is enough — a changed prefix takes effect
 * within a minute at worst.
 */
export interface PrefixConfig {
	prefix: string;
	isEnabled: boolean;
}

const prefixCache = new Map<string, { config: PrefixConfig; expiresAt: number }>();

function remember(guildId: string, config: PrefixConfig): PrefixConfig {
	if (prefixCache.size > CACHE.guildSettingsMaxEntries) prefixCache.clear();
	prefixCache.set(guildId, { config, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });
	return config;
}

export async function getPrefixConfig(guildId: string): Promise<PrefixConfig> {
	const cached = prefixCache.get(guildId);
	if (cached && cached.expiresAt > Date.now()) return cached.config;

	const record = await GuildPrefix.findOne({ guildId }).lean<PrefixSettings>().exec();

	return remember(guildId, {
		prefix: record?.prefix ?? DEFAULT_PREFIX,
		// A server that has never touched the setting gets prefix commands on.
		isEnabled: record?.isEnabled ?? true,
	});
}

export async function getPrefix(guildId: string): Promise<string> {
	return (await getPrefixConfig(guildId)).prefix;
}

export async function setPrefix(guildId: string, prefix: string): Promise<string> {
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, { $set: { prefix } }, UPSERT)
		.lean<PrefixSettings>()
		.exec();

	remember(guildId, { prefix, isEnabled: record?.isEnabled ?? true });
	return prefix;
}

export async function setPrefixEnabled(guildId: string, isEnabled: boolean): Promise<PrefixConfig> {
	const record = await GuildPrefix.findOneAndUpdate({ guildId }, { $set: { isEnabled } }, UPSERT)
		.lean<PrefixSettings>()
		.exec();

	return remember(guildId, { prefix: record?.prefix ?? DEFAULT_PREFIX, isEnabled });
}

/** Used by the tests, and after a prefix is changed elsewhere. */
export function clearPrefixCache(): void {
	prefixCache.clear();
}

export async function getAntiLink(guildId: string): Promise<AntiLinkSettings | null> {
	return AntiLink.findOne({ guildId }).lean<AntiLinkSettings>().exec();
}

export async function setAntiLink(guildId: string, bypassPermission: string): Promise<AntiLinkSettings> {
	return AntiLink.findOneAndUpdate(
		{ guildId },
		{ $set: { bypassPermission } },
		UPSERT,
	).exec() as Promise<AntiLinkSettings>;
}

export async function disableAntiLink(guildId: string): Promise<boolean> {
	return (await AntiLink.deleteOne({ guildId }).exec()).deletedCount > 0;
}

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

export async function getAutoRoles(guildId: string): Promise<AutoRoleSettings | null> {
	return AutoRole.findOne({ guildId }).lean<AutoRoleSettings>().exec();
}

export async function addAutoRole(guildId: string, roleId: string): Promise<AutoRoleSettings> {
	return AutoRole.findOneAndUpdate(
		{ guildId },
		{ $addToSet: { roleIds: roleId } },
		UPSERT,
	).exec() as Promise<AutoRoleSettings>;
}

export async function removeAutoRole(guildId: string, roleId: string): Promise<AutoRoleSettings | null> {
	return AutoRole.findOneAndUpdate({ guildId }, { $pull: { roleIds: roleId } }, { new: true, lean: true })
		.lean<AutoRoleSettings>()
		.exec();
}

export async function getCounting(guildId: string): Promise<CountingSettings | null> {
	return Counting.findOne({ guildId }).lean<CountingSettings>().exec();
}

export async function setCounting(guildId: string, channelId: string, maxCount: number): Promise<CountingSettings> {
	return Counting.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, maxCount }, $setOnInsert: { count: 0, lastUserId: null } },
		UPSERT,
	).exec() as Promise<CountingSettings>;
}

export async function disableCounting(guildId: string): Promise<boolean> {
	return (await Counting.deleteOne({ guildId }).exec()).deletedCount > 0;
}

/**
 * Conditional increment: the expected count and "not the same user twice" rule are
 * both in the filter, so two concurrent messages cannot double-count.
 */
export async function advanceCount(
	guildId: string,
	expected: number,
	userId: string,
): Promise<CountingSettings | null> {
	return Counting.findOneAndUpdate(
		{ guildId, count: expected - 1, lastUserId: { $ne: userId } },
		{ $set: { count: expected, lastUserId: userId } },
		{ new: true, lean: true },
	)
		.lean<CountingSettings>()
		.exec();
}

export async function resetCount(guildId: string): Promise<void> {
	await Counting.updateOne({ guildId }, { $set: { count: 0, lastUserId: null } }).exec();
}

export async function listSticky(guildId: string): Promise<StickyMessage[]> {
	return Sticky.find({ guildId }).lean<StickyMessage[]>().exec();
}

export async function setSticky(
	guildId: string,
	channelId: string,
	message: string,
	cap: number,
): Promise<StickyMessage> {
	return Sticky.findOneAndUpdate(
		{ guildId, channelId },
		{ $set: { message, cap }, $setOnInsert: { count: 0, lastMessageId: null } },
		UPSERT,
	).exec() as Promise<StickyMessage>;
}

export async function removeSticky(guildId: string, channelId: string): Promise<boolean> {
	return (await Sticky.deleteOne({ guildId, channelId }).exec()).deletedCount > 0;
}

/** Claims the "time to repost" transition atomically so the sticky cannot double-post. */
export async function bumpSticky(guildId: string, channelId: string): Promise<StickyMessage | null> {
	const record = await Sticky.findOneAndUpdate(
		{ guildId, channelId },
		{ $inc: { count: 1 } },
		{ new: true, lean: true },
	)
		.lean<StickyMessage>()
		.exec();

	if (!record || record.count < record.cap) return null;

	return Sticky.findOneAndUpdate(
		{ guildId, channelId, count: { $gte: record.cap } },
		{ $set: { count: 0 } },
		{ new: true, lean: true },
	)
		.lean<StickyMessage>()
		.exec();
}

export async function setStickyMessageId(guildId: string, channelId: string, messageId: string): Promise<void> {
	await Sticky.updateOne({ guildId, channelId }, { $set: { lastMessageId: messageId } }).exec();
}

export async function getWelcome(guildId: string): Promise<WelcomeSettings | null> {
	return Welcome.findOne({ guildId }).lean<WelcomeSettings>().exec();
}

export async function setWelcome(
	guildId: string,
	channelId: string,
	message: string,
	isEmbed: boolean,
): Promise<WelcomeSettings> {
	return Welcome.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, message, isEmbed } },
		UPSERT,
	).exec() as Promise<WelcomeSettings>;
}

/** Partial update, so the panel can change one setting without resending the rest. */
export async function saveWelcome(
	guildId: string,
	patch: Partial<Pick<WelcomeSettings, "channelId" | "message" | "style" | "background">>,
): Promise<WelcomeSettings> {
	return Welcome.findOneAndUpdate({ guildId }, { $set: patch }, UPSERT).exec() as Promise<WelcomeSettings>;
}

export async function disableWelcome(guildId: string): Promise<boolean> {
	return (await Welcome.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function getVoiceCounter(guildId: string): Promise<VoiceCounterSettings | null> {
	return VoiceCounter.findOne({ guildId }).lean<VoiceCounterSettings>().exec();
}

export async function setVoiceCounter(
	guildId: string,
	fields: Partial<Pick<VoiceCounterSettings, "memberChannelId" | "botChannelId">>,
): Promise<VoiceCounterSettings> {
	return VoiceCounter.findOneAndUpdate({ guildId }, { $set: fields }, UPSERT).exec() as Promise<VoiceCounterSettings>;
}

export async function getFixedStats(guildId: string): Promise<FixedStatsMessage | null> {
	return FixedStats.findOne({ guildId }).lean<FixedStatsMessage>().exec();
}

export async function listFixedStats(): Promise<FixedStatsMessage[]> {
	return FixedStats.find().lean<FixedStatsMessage[]>().exec();
}

export async function setFixedStats(
	guildId: string,
	channelId: string,
	messageId: string,
	userId: string,
): Promise<FixedStatsMessage> {
	return FixedStats.findOneAndUpdate(
		{ guildId },
		{ $set: { channelId, messageId, userId } },
		UPSERT,
	).exec() as Promise<FixedStatsMessage>;
}

export async function removeFixedStats(guildId: string): Promise<boolean> {
	return (await FixedStats.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function getTreasureConfig(guildId: string): Promise<TreasureConfigSettings | null> {
	return TreasureConfig.findOne({ guildId }).lean<TreasureConfigSettings>().exec();
}

export async function saveTreasureConfig(
	guildId: string,
	fields: Partial<Omit<TreasureConfigSettings, "guildId" | "createdAt" | "updatedAt">> & { lastModifiedBy: string },
): Promise<TreasureConfigSettings> {
	return TreasureConfig.findOneAndUpdate(
		{ guildId },
		{ $set: fields, $setOnInsert: { guildId, createdBy: fields.lastModifiedBy } },
		UPSERT,
	).exec() as Promise<TreasureConfigSettings>;
}

/** Deletes every per-guild document when the bot is removed from a server. */
export async function purgeGuild(guildId: string): Promise<void> {
	prefixCache.delete(guildId);
	await Promise.all([
		AntiLink.deleteMany({ guildId }).exec(),
		AuditLogConfig.deleteMany({ guildId }).exec(),
		AutoRole.deleteMany({ guildId }).exec(),
		Counting.deleteMany({ guildId }).exec(),
		Sticky.deleteMany({ guildId }).exec(),
		Welcome.deleteMany({ guildId }).exec(),
		VoiceCounter.deleteMany({ guildId }).exec(),
		FixedStats.deleteMany({ guildId }).exec(),
		TreasureConfig.deleteMany({ guildId }).exec(),
		GuildPrefix.deleteMany({ guildId }).exec(),
	]);
}
