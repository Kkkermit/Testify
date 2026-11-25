import { z } from "zod";
import { snowflake } from "./schemas";

/** Screens opened, by route pattern and bot-wide; no guild or user id, since a server's managers are identifiable. */
export interface ScreenTally {
	route: string;
	count: number;
}

/** Every dashboard screen a view is counted against, so a request cannot fill the tally with routes of its own. */
export const SCREEN_ROUTES = [
	"/account",
	"/appeals",
	"/appearance",
	"/guilds",
	"/guilds/compare",
	"/guilds/:guildId",
	"/guilds/:guildId/insights",
	"/guilds/:guildId/invites",
	"/guilds/:guildId/levelling",
	"/guilds/:guildId/welcome",
	"/guilds/:guildId/audit-log",
	"/guilds/:guildId/settings",
	"/guilds/:guildId/backup",
	"/guilds/:guildId/access",
	"/guilds/:guildId/access/:userId",
	"/guilds/:guildId/automod",
	"/guilds/:guildId/sticky",
	"/guilds/:guildId/auto-responders",
	"/guilds/:guildId/birthdays",
	"/guilds/:guildId/cases",
	"/guilds/:guildId/raid-protection",
	"/guilds/:guildId/bans",
	"/guilds/:guildId/appeals",
	"/guilds/:guildId/modmail",
	"/guilds/:guildId/channel-tools",
	"/guilds/:guildId/channels/:channelId",
	"/guilds/:guildId/channels",
	"/guilds/:guildId/inbox",
	"/guilds/:guildId/week",
	"/guilds/:guildId/roles",
	"/guilds/:guildId/roles/:roleId",
	"/guilds/:guildId/announcements",
	"/guilds/:guildId/scheduled-messages",
	"/guilds/:guildId/role-menus",
	"/guilds/:guildId/ideas",
	"/guilds/:guildId/starboard",
	"/guilds/:guildId/temp-voice",
	"/guilds/:guildId/economy",
	"/guilds/:guildId/treasure",
	"/guilds/:guildId/music",
	"/guilds/:guildId/casino",
	"/guilds/:guildId/tickets",
	"/guilds/:guildId/warnings",
	"/guilds/:guildId/changes",
	"/guilds/:guildId/bot-stats",
	"/guilds/:guildId/member-count",
	"/guilds/:guildId/lottery",
	"/guilds/:guildId/giveaways",
	"/guilds/:guildId/members",
	"/guilds/:guildId/members/:userId",
	"/guilds/:guildId/commands",
	"/commands",
	"/help",
	"/status",
	"/notifications",
	"/owner",
] as const;

type ScreenRoute = (typeof SCREEN_ROUTES)[number];

export function isScreenRoute(route: string): route is ScreenRoute {
	return (SCREEN_ROUTES as readonly string[]).includes(route);
}

/** `guildId` is counted only when the person sending it may manage that server, which the API checks. */
export const screenView = z.object({ route: z.enum(SCREEN_ROUTES), guildId: snowflake.optional() });

export type ScreenView = z.infer<typeof screenView>;
