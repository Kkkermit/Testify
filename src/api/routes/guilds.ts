import { ChannelType, type Guild, type GuildBasedChannel, PermissionFlagsBits, type Role } from "discord.js";
import { type Context, Hono } from "hono";
import { type ApiBindings, guildOf, readerOf } from "@api/context";
import { holdsPermission, requireReach } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { announcements } from "@api/routes/announcements";
import { auditLog } from "@api/routes/auditLog";
import { automod } from "@api/routes/automod";
import { autoResponders } from "@api/routes/autoResponders";
import { bans } from "@api/routes/bans";
import { birthdays } from "@api/routes/birthdays";
import { botStats } from "@api/routes/botStats";
import { cases } from "@api/routes/cases";
import { casino } from "@api/routes/casino";
import { channelTools } from "@api/routes/channelTools";
import { guildCommandToggles } from "@api/routes/commandToggles";
import { giveaways } from "@api/routes/giveaways";
import { goodbye } from "@api/routes/goodbye";
import { ideas } from "@api/routes/ideas";
import { levelling } from "@api/routes/levelling";
import { lottery } from "@api/routes/lottery";
import { memberCount } from "@api/routes/memberCount";
import { members } from "@api/routes/members";
import { music } from "@api/routes/music";
import { raid } from "@api/routes/raid";
import { roleMenus } from "@api/routes/roleMenus";
import { scheduledMessages } from "@api/routes/scheduledMessages";
import { settings } from "@api/routes/settings";
import { setup } from "@api/routes/setup";
import { starboard } from "@api/routes/starboard";
import { sticky } from "@api/routes/sticky";
import { tempVoice } from "@api/routes/tempVoice";
import { tickets } from "@api/routes/tickets";
import { treasure } from "@api/routes/treasure";
import { verification } from "@api/routes/verification";
import { warnings } from "@api/routes/warnings";
import { welcome } from "@api/routes/welcome";
import { parseParams, parseQuery } from "@api/validate";
import {
	auditPage,
	type AuditAudience,
	countAudits,
	recentAudits,
} from "@database/repositories/dashboardAuditRepository";
import { canPostInChannel, readerSees } from "@lib/discord";
import { readInsights } from "@lib/info";
import { readServerChanges } from "@lib/moderation";
import { isPowerful } from "@lib/roles";
import { featuresOf } from "@lib/settings";
import {
	type AuditEntrySummary,
	type ChannelKind,
	changesQuery,
	insightsQuery,
	type InsightWindow,
	type ChannelSummary,
	type GuildOverview,
	guildIdParam,
	type Paged,
	pagination,
	type RoleSummary,
	WATCHED_PERMISSIONS,
	type WatchedPermission,
} from "@testify/shared";

export const guilds = new Hono<ApiBindings>();

guilds.use("/:guildId/*", requireGuild);
guilds.use("/:guildId/*", requireReach);

// Mounted here so they inherit `requireGuild` and read the guild from the path like everything else.
guilds.route("/:guildId/levelling", levelling);
guilds.route("/:guildId/welcome", welcome);
guilds.route("/:guildId/goodbye", goodbye);
guilds.route("/:guildId/birthdays", birthdays);
guilds.route("/:guildId/audit-log", auditLog);
guilds.route("/:guildId/settings", settings);
guilds.route("/:guildId/commands", guildCommandToggles);
guilds.route("/:guildId/automod", automod);
guilds.route("/:guildId/cases", cases);
guilds.route("/:guildId/bans", bans);
guilds.route("/:guildId/channel-tools", channelTools);
guilds.route("/:guildId/announcements", announcements);
guilds.route("/:guildId/raid-protection", raid);
guilds.route("/:guildId/sticky", sticky);
guilds.route("/:guildId/auto-responders", autoResponders);
guilds.route("/:guildId/scheduled-messages", scheduledMessages);
guilds.route("/:guildId/tickets", tickets);
guilds.route("/:guildId/lottery", lottery);
guilds.route("/:guildId/casino", casino);
guilds.route("/:guildId/treasure", treasure);
guilds.route("/:guildId/giveaways", giveaways);
guilds.route("/:guildId/ideas", ideas);
guilds.route("/:guildId/verification", verification);
guilds.route("/:guildId/members", members);
guilds.route("/:guildId/music", music);
guilds.route("/:guildId/role-menus", roleMenus);
guilds.route("/:guildId/bot-stats", botStats);
guilds.route("/:guildId/member-count", memberCount);
guilds.route("/:guildId/warnings", warnings);
guilds.route("/:guildId/starboard", starboard);
guilds.route("/:guildId/temp-voice", tempVoice);
guilds.route("/:guildId/setup", setup);

guilds.get("/:guildId/overview", async (context) => {
	const guild = guildOf(context);
	const [features, recent] = await Promise.all([featuresOf(guild), recentAudits(guild.id, 8, audienceOf(context))]);

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
 * `canSend` comes from the live client, so the picker can grey out a channel before a configuration that cannot work is
 * saved.
 */
guilds.get("/:guildId/channels", (context) => {
	const guild = guildOf(context);
	const reader = readerOf(context);

	// A channel the reader cannot see keeps its id, so a setting pointing there is not mistaken for a deleted one.
	const channels = [...guild.channels.cache.values()]
		.filter((channel) => kindOf(channel) !== "other")
		.map<ChannelSummary>((channel) => ({
			id: channel.id,
			name: readerSees(channel, reader) ? channel.name : null,
			kind: kindOf(channel),
			position: "position" in channel ? channel.position : 0,
			canSend: canPostInChannel(guild, channel),
		}))
		.sort((a, b) => a.position - b.position || (a.name ?? "").localeCompare(b.name ?? ""));

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
			powerful: isPowerful(role),
		}))
		.sort((a, b) => b.position - a.position);

	return context.json(roles);
});

guilds.get("/:guildId/audit", async (context) => {
	const { guildId } = parseParams(context, guildIdParam);
	const { page, perPage } = parseQuery(context, pagination);

	const audience = audienceOf(context);
	const [rows, total] = await Promise.all([
		auditPage(guildId, page, perPage, audience),
		countAudits(guildId, audience),
	]);

	const body: Paged<AuditEntrySummary> = { items: rows.map(toAuditSummary), total, page, perPage };
	return context.json(body);
});

/** The last fortnight's changes, from the dashboard and from Discord's own audit log, newest first. */
guilds.get("/:guildId/changes", async (context) => {
	const query = parseQuery(context, changesQuery);

	return context.json(
		await readServerChanges(guildOf(context), query, {
			...audienceOf(context),
			auditLog: holdsPermission(context, PermissionFlagsBits.ViewAuditLog),
		}),
	);
});

guilds.get("/:guildId/insights", async (context) => {
	const { days } = parseQuery(context, insightsQuery);

	return context.json(await readInsights(guildOf(context), days as InsightWindow, readerOf(context)));
});

/** Moderation records are what `/case list` shows, so they ask what it asks. */
function audienceOf(context: Context<ApiBindings>): AuditAudience {
	return { moderation: holdsPermission(context, PermissionFlagsBits.ModerateMembers) };
}

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

/** Permissions Discord can revoke silently, named so a manager can act on them. */
function missingPermissions(guild: Guild): WatchedPermission[] {
	const me = guild.members.me;
	if (me === null) return [];

	return WATCHED_PERMISSIONS.filter((flag) => !me.permissions.has(PermissionFlagsBits[flag]));
}
