import { ChannelType, type Guild, type GuildBasedChannel, PermissionFlagsBits, type Role } from "discord.js";
import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { auditLog } from "@api/routes/auditLog";
import { automod } from "@api/routes/automod";
import { guildCommandToggles } from "@api/routes/commandToggles";
import { levelling } from "@api/routes/levelling";
import { lottery } from "@api/routes/lottery";
import { settings } from "@api/routes/settings";
import { sticky } from "@api/routes/sticky";
import { tickets } from "@api/routes/tickets";
import { treasure } from "@api/routes/treasure";
import { verification } from "@api/routes/verification";
import { welcome } from "@api/routes/welcome";
import { parseParams, parseQuery } from "@api/validate";
import { auditPage, countAudits, recentAudits } from "@database/repositories/dashboardAuditRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import {
	getAntiLink,
	getAuditLogConfig,
	getAutoRoles,
	getCounting,
	getVoiceCounter,
	getWelcome,
	listSticky,
} from "@database/repositories/settingsRepository";
import { getVerifyConfig } from "@database/repositories/verificationRepository";
import { canPostInChannel } from "@lib/channels.util";
import { normaliseSettings } from "@lib/levelling.util";
import { readLottery } from "@lib/lotteryActions.util";
import { readTickets } from "@lib/ticketActions.util";
import { readTreasure } from "@lib/treasureActions.util";
import {
	type AuditEntrySummary,
	type ChannelKind,
	type ChannelSummary,
	type FeatureStatus,
	type GuildOverview,
	guildIdParam,
	type Paged,
	pagination,
	type RoleSummary,
} from "@testify/shared";

export const guilds = new Hono<ApiBindings>();

guilds.use("/:guildId/*", requireGuild);

// Mounted here so they inherit `requireGuild` and read the guild from the path like everything else.
guilds.route("/:guildId/levelling", levelling);
guilds.route("/:guildId/welcome", welcome);
guilds.route("/:guildId/audit-log", auditLog);
guilds.route("/:guildId/settings", settings);
guilds.route("/:guildId/commands", guildCommandToggles);
guilds.route("/:guildId/automod", automod);
guilds.route("/:guildId/sticky", sticky);
guilds.route("/:guildId/tickets", tickets);
guilds.route("/:guildId/lottery", lottery);
guilds.route("/:guildId/treasure", treasure);
guilds.route("/:guildId/verification", verification);

function guildOf(context: { get: (key: "guild") => Guild | undefined }): Guild {
	const guild = context.get("guild");
	// `requireGuild` sets this before any handler runs; reaching here without it is a wiring mistake.
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

guilds.get("/:guildId/overview", async (context) => {
	const guild = guildOf(context);
	const [features, recent] = await Promise.all([featuresOf(guild), recentAudits(guild.id, 8)]);

	const body: GuildOverview = {
		id: guild.id,
		name: guild.name,
		iconUrl: guild.iconURL({ size: 128 }),
		memberCount: guild.memberCount,
		channelCount: guild.channels.cache.size,
		roleCount: guild.roles.cache.size,
		features,
		missingPermissions: missingPermissions(guild),
		recentChanges: recent.map(toAuditSummary),
	};

	return context.json(body);
});

/**
 * `canSend` is computed from the live client, which is the single biggest reason this API lives in the bot
 * process: the picker can grey out a channel before anyone saves a configuration that cannot work.
 */
guilds.get("/:guildId/channels", (context) => {
	const guild = guildOf(context);

	const channels = [...guild.channels.cache.values()]
		.filter((channel) => kindOf(channel) !== "other")
		.map<ChannelSummary>((channel) => ({
			id: channel.id,
			name: channel.name,
			kind: kindOf(channel),
			position: "position" in channel ? channel.position : 0,
			canSend: canPostInChannel(guild, channel),
		}))
		.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

	return context.json(channels);
});

guilds.get("/:guildId/roles", (context) => {
	const guild = guildOf(context);
	const highest = guild.members.me?.roles.highest.position ?? 0;

	const roles = [...guild.roles.cache.values()]
		.filter((role) => role.id !== guild.id)
		.map<RoleSummary>((role) => ({
			id: role.id,
			name: role.name,
			colour: colourOf(role),
			position: role.position,
			managed: role.managed,
			// The check `applyLevelRewards` already does at runtime, surfaced at configuration time instead.
			assignableByBot: !role.managed && role.position < highest,
		}))
		.sort((a, b) => b.position - a.position);

	return context.json(roles);
});

guilds.get("/:guildId/audit", async (context) => {
	const { guildId } = parseParams(context, guildIdParam);
	const { page, perPage } = parseQuery(context, pagination);

	const [rows, total] = await Promise.all([auditPage(guildId, page, perPage), countAudits(guildId)]);

	const body: Paged<AuditEntrySummary> = { items: rows.map(toAuditSummary), total, page, perPage };
	return context.json(body);
});

function toAuditSummary(record: { actorTag: string; action: string; summary: string; at: Date }): AuditEntrySummary {
	return { actorTag: record.actorTag, action: record.action, summary: record.summary, at: record.at.toISOString() };
}

/** Threads, forums and media channels are never what a setting points at, so they fall through to "other". */
const KINDS = new Map<number, ChannelKind>([
	[ChannelType.GuildText, "text"],
	[ChannelType.GuildAnnouncement, "announcement"],
	[ChannelType.GuildVoice, "voice"],
	[ChannelType.GuildStageVoice, "voice"],
	[ChannelType.GuildCategory, "category"],
]);

function kindOf(channel: GuildBasedChannel): ChannelKind {
	return KINDS.get(channel.type) ?? "other";
}

function colourOf(role: Role): string | null {
	return role.color === 0 ? null : `#${role.color.toString(16).padStart(6, "0")}`;
}

/** One line per feature, read through the repositories so the web and the Discord panels cannot disagree. */
async function featuresOf(guild: Guild): Promise<FeatureStatus[]> {
	const [levels, audit, welcome, antiLink, counting, autoRoles, verify, voice, stickies, treasure, ticketing, draw] =
		await Promise.all([
			getLevelSettings(guild.id),
			getAuditLogConfig(guild.id),
			getWelcome(guild.id),
			getAntiLink(guild.id),
			getCounting(guild.id),
			getAutoRoles(guild.id),
			getVerifyConfig(guild.id),
			getVoiceCounter(guild.id),
			listSticky(guild.id),
			readTreasure(guild.id),
			readTickets(guild),
			readLottery(guild.id),
		]);

	const level = normaliseSettings(levels);

	return [
		{
			key: "levelling",
			label: "Levelling",
			enabled: level.enabled,
			detail: level.enabled
				? `${count(level.rewards.length, "role reward")}, ${count(level.boosts.length, "boost")}`
				: null,
		},
		{
			key: "audit-logging",
			label: "Audit logging",
			enabled: audit !== null && audit.enabledLogs.length > 0,
			detail: audit === null ? null : count(audit.enabledLogs.length, "event"),
		},
		{
			key: "welcome",
			label: "Welcome messages",
			enabled: (welcome?.channelId ?? null) !== null,
			detail: welcome?.channelId === undefined ? null : `Posting in <#${welcome.channelId}>`,
		},
		{
			key: "verification",
			label: "Verification",
			enabled: verify !== null,
			detail: verify === null ? null : count(verify.verifiedIds.length, "member verified"),
		},
		{
			key: "anti-link",
			label: "Anti-link",
			enabled: antiLink !== null,
			detail: antiLink === null ? null : `Bypass: ${antiLink.bypassPermission}`,
		},
		{
			key: "counting",
			label: "Counting",
			enabled: counting !== null,
			detail: counting === null ? null : `At ${String(counting.count)}`,
		},
		{
			key: "auto-roles",
			label: "Auto roles",
			enabled: (autoRoles?.roleIds.length ?? 0) > 0,
			detail: autoRoles === null ? null : count(autoRoles.roleIds.length, "role"),
		},
		{
			key: "voice-stats",
			label: "Voice stats",
			enabled: voice !== null,
			detail: null,
		},
		{
			key: "sticky",
			label: "Sticky messages",
			enabled: stickies.length > 0,
			detail: stickies.length === 0 ? null : count(stickies.length, "channel"),
		},
		{
			key: "treasure",
			label: "Treasure drops",
			enabled: treasure.enabled,
			detail: treasure.configured ? `${String(treasure.minAmount)}–${String(treasure.maxAmount)} a drop` : null,
		},
		{
			key: "tickets",
			label: "Tickets",
			enabled: ticketing.enabled,
			detail: ticketing.enabled ? count(ticketing.openTickets, "ticket open") : null,
		},
		{
			key: "lottery",
			label: "Lottery",
			enabled: draw.enabled && !draw.frozen,
			detail: draw.enabled ? count(draw.ticketsSold, "ticket sold") : null,
		},
	];
}

function count(value: number, noun: string): string {
	return `${String(value)} ${noun}${value === 1 ? "" : "s"}`;
}

/**
 * Named in words a person can act on. Discord grants these silently and revokes them silently, so a feature can
 * be configured perfectly and still do nothing.
 */
const WATCHED = [
	[PermissionFlagsBits.ManageRoles, "Manage Roles — needed for level rewards, auto roles and verification"],
	[PermissionFlagsBits.ManageMessages, "Manage Messages — needed for counting and sticky messages"],
	[PermissionFlagsBits.ViewAuditLog, "View Audit Log — needed for audit logging to name who did what"],
	[PermissionFlagsBits.ManageChannels, "Manage Channels — needed for voice stats and tickets"],
	[PermissionFlagsBits.AttachFiles, "Attach Files — needed for rank cards and welcome images"],
] as const;

function missingPermissions(guild: Guild): string[] {
	const me = guild.members.me;
	if (me === null) return [];

	return WATCHED.filter(([flag]) => !me.permissions.has(flag)).map(([, description]) => description);
}
