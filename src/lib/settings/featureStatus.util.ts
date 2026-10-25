import { type Guild } from "discord.js";
import { getAntiLink } from "@database/repositories/antiLinkRepository";
import { getAuditLogConfig } from "@database/repositories/auditLogRepository";
import { listAutoResponders } from "@database/repositories/autoResponderRepository";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { getFixedStats } from "@database/repositories/botStatsRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { getGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { getIdeaSettings } from "@database/repositories/ideaRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { countRoleMenus } from "@database/repositories/roleMenuRepository";
import { listSchedules } from "@database/repositories/scheduledMessageRepository";
import { getStarboardSettings } from "@database/repositories/starboardRepository";
import { listSticky } from "@database/repositories/stickyRepository";
import { getTempVoiceSettings } from "@database/repositories/tempVoiceRepository";
import { getVerifyConfig } from "@database/repositories/verificationRepository";
import { getVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { getWelcome } from "@database/repositories/welcomeRepository";
import { readCasinoSettings } from "@lib/casino/casinoSettings.util";
import { readLottery } from "@lib/economy/lotteryActions.util";
import { readTreasure } from "@lib/economy/treasureActions.util";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import { readTickets } from "@lib/tickets/ticketActions.util";
import { CASINO_GAMES, type FeatureStatus } from "@testify/shared";

/** What the overview says about each feature: one entry each, read through the same repositories the panels use. */

type Reading = Pick<FeatureStatus, "enabled" | "detail">;

interface FeatureSource {
	key: string;
	label: string;
	read(guild: Guild): Promise<Reading>;
}

/** A phrase ending in something other than its noun, like "ticket sold", gives its plural. */
export function countOf(value: number, one: string, many = `${one}s`): string {
	return `${String(value)} ${value === 1 ? one : many}`;
}

const posting = (channelId: string): string => `Posting in <#${channelId}>`;

export const FEATURE_SOURCES: readonly FeatureSource[] = [
	{
		key: "levelling",
		label: "Levelling",
		async read(guild) {
			const level = normaliseSettings(await getLevelSettings(guild.id));
			return {
				enabled: level.enabled,
				detail: level.enabled
					? `${countOf(level.rewards.length, "role reward")}, ${countOf(level.boosts.length, "boost")}`
					: null,
			};
		},
	},
	{
		key: "audit-logging",
		label: "Audit logging",
		async read(guild) {
			const audit = await getAuditLogConfig(guild.id);
			return {
				enabled: audit !== null && audit.enabledLogs.length > 0,
				detail: audit === null ? null : countOf(audit.enabledLogs.length, "event"),
			};
		},
	},
	{
		key: "welcome",
		label: "Welcome messages",
		async read(guild) {
			const channelId = (await getWelcome(guild.id))?.channelId ?? null;
			return { enabled: channelId !== null, detail: channelId === null ? null : posting(channelId) };
		},
	},
	{
		key: "goodbye",
		label: "Goodbye messages",
		async read(guild) {
			const goodbye = await getGoodbyeSettings(guild.id);
			const channelId = goodbye?.enabled === true ? goodbye.channelId : null;
			return { enabled: channelId !== null, detail: channelId === null ? null : posting(channelId) };
		},
	},
	{
		key: "verification",
		label: "Verification",
		async read(guild) {
			const verify = await getVerifyConfig(guild.id);
			return {
				enabled: verify !== null,
				detail: verify === null ? null : countOf(verify.verifiedIds.length, "member verified", "members verified"),
			};
		},
	},
	{
		key: "anti-link",
		label: "Anti-link",
		async read(guild) {
			const antiLink = await getAntiLink(guild.id);
			return { enabled: antiLink !== null, detail: antiLink === null ? null : `Bypass: ${antiLink.bypassPermission}` };
		},
	},
	{
		key: "counting",
		label: "Counting",
		async read(guild) {
			const counting = await getCounting(guild.id);
			return { enabled: counting !== null, detail: counting === null ? null : `At ${String(counting.count)}` };
		},
	},
	{
		key: "auto-roles",
		label: "Auto roles",
		async read(guild) {
			const roleIds = (await getAutoRoles(guild.id))?.roleIds ?? null;
			return {
				enabled: (roleIds?.length ?? 0) > 0,
				detail: roleIds === null ? null : countOf(roleIds.length, "role"),
			};
		},
	},
	{
		key: "role-menus",
		label: "Role menus",
		async read(guild) {
			const menus = await countRoleMenus(guild.id);
			return { enabled: menus > 0, detail: menus === 0 ? null : countOf(menus, "menu") };
		},
	},
	{
		key: "ideas",
		label: "Idea board",
		async read(guild) {
			const board = await getIdeaSettings(guild.id);
			const on = board?.enabled === true;
			return { enabled: on, detail: on && board.channelId !== null ? posting(board.channelId) : null };
		},
	},
	{
		key: "starboard",
		label: "Starboard",
		async read(guild) {
			const stars = await getStarboardSettings(guild.id);
			const on = stars?.enabled === true;
			return {
				enabled: on,
				detail: on && stars.channelId !== null ? `${String(stars.threshold)} ⭐ to reach <#${stars.channelId}>` : null,
			};
		},
	},
	{
		key: "temp-voice",
		label: "Join to create",
		async read(guild) {
			const lobby = await getTempVoiceSettings(guild.id);
			const on = lobby?.enabled === true;
			return {
				enabled: on,
				detail: on && lobby.lobbyChannelId !== null ? `Lobby: <#${lobby.lobbyChannelId}>` : null,
			};
		},
	},
	{
		key: "voice-stats",
		label: "Voice stats",
		async read(guild) {
			return { enabled: (await getVoiceCounter(guild.id)) !== null, detail: null };
		},
	},
	{
		key: "sticky",
		label: "Sticky messages",
		async read(guild) {
			const stickies = await listSticky(guild.id);
			return {
				enabled: stickies.length > 0,
				detail: stickies.length === 0 ? null : countOf(stickies.length, "channel"),
			};
		},
	},
	{
		key: "auto-responders",
		label: "Auto-responders",
		async read(guild) {
			const responders = await listAutoResponders(guild.id);
			return {
				enabled: responders.length > 0,
				detail: responders.length === 0 ? null : countOf(responders.length, "auto-responder"),
			};
		},
	},
	{
		key: "scheduled-messages",
		label: "Scheduled messages",
		async read(guild) {
			const schedules = await listSchedules(guild.id);
			return {
				enabled: schedules.length > 0,
				detail: schedules.length === 0 ? null : countOf(schedules.length, "message"),
			};
		},
	},
	{
		key: "treasure",
		label: "Treasure drops",
		async read(guild) {
			const treasure = await readTreasure(guild.id);
			return {
				enabled: treasure.enabled,
				detail: treasure.configured ? `${String(treasure.minAmount)}–${String(treasure.maxAmount)} a drop` : null,
			};
		},
	},
	{
		key: "tickets",
		label: "Tickets",
		async read(guild) {
			const tickets = await readTickets(guild);
			return {
				enabled: tickets.enabled,
				detail: tickets.enabled ? countOf(tickets.openTickets, "ticket open", "tickets open") : null,
			};
		},
	},
	{
		key: "lottery",
		label: "Lottery",
		async read(guild) {
			const draw = await readLottery(guild.id);
			return {
				enabled: draw.enabled && !draw.frozen,
				detail: draw.enabled ? countOf(draw.ticketsSold, "ticket sold", "tickets sold") : null,
			};
		},
	},
	{
		key: "casino",
		label: "Casino",
		async read(guild) {
			const tables = await readCasinoSettings(guild.id);
			const open = CASINO_GAMES.filter((game) => tables.games[game]).length;
			return {
				enabled: tables.enabled,
				detail: tables.enabled ? `${String(open)} of ${String(CASINO_GAMES.length)} games open` : null,
			};
		},
	},
	{
		key: "bot-stats",
		label: "Bot statistics",
		async read(guild) {
			const stats = await getFixedStats(guild.id);
			return { enabled: stats !== null, detail: stats === null ? null : posting(stats.channelId) };
		},
	},
];

/** Every feature read at once, in the order the overview lists them. */
export async function featuresOf(guild: Guild): Promise<FeatureStatus[]> {
	return Promise.all(
		FEATURE_SOURCES.map(async (source) => ({ key: source.key, label: source.label, ...(await source.read(guild)) })),
	);
}
