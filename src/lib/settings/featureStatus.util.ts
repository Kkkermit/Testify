import { type Guild } from "discord.js";
import { getAntiLink } from "@database/repositories/antiLinkRepository";
import { getAuditLogConfig } from "@database/repositories/auditLogRepository";
import { listAutoResponders } from "@database/repositories/autoResponderRepository";
import { getAutoRoles } from "@database/repositories/autoRoleRepository";
import { countBirthdays, getBirthdaySettings } from "@database/repositories/birthdayRepository";
import { getFixedStats } from "@database/repositories/botStatsRepository";
import { getCaseSettings } from "@database/repositories/caseRepository";
import { getCounting } from "@database/repositories/countingRepository";
import { getGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { getIdeaSettings } from "@database/repositories/ideaRepository";
import { getLevelSettings } from "@database/repositories/levelRepository";
import { getRaidSettings } from "@database/repositories/raidRepository";
import { listRoleMenus } from "@database/repositories/roleMenuRepository";
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
import {
	CASINO_GAMES,
	FEATURE_PLACES,
	type FeatureCount,
	type FeatureDetail,
	type FeatureKey,
	type FeaturePlaces,
	type FeatureStatus,
	type Place,
	type PlaceRole,
} from "@testify/shared";

/** What the overview says about each feature and where it works: one read each, through the repositories the panels use. */

type Reading = Pick<FeatureStatus, "enabled" | "detail"> & { places: Place[] };

interface FeatureSource {
	key: FeatureKey;
	label: string;
	read(guild: Guild): Promise<Reading>;
}

const posting = (channelId: string): FeatureDetail => ({ kind: "posting", channelId });
const counted = (what: FeatureCount, count: number): FeatureDetail => ({ kind: "count", what, count });

/** The channels among `ids` that are set, each doing `role`. */
function at(role: PlaceRole, ...ids: (string | null | undefined)[]): Place[] {
	return ids.filter((id): id is string => typeof id === "string").map((channelId) => ({ channelId, role }));
}

export const FEATURE_SOURCES: readonly FeatureSource[] = [
	{
		key: "levelling",
		label: "Levelling",
		async read(guild) {
			const level = normaliseSettings(await getLevelSettings(guild.id));
			return {
				enabled: level.enabled,
				detail: level.enabled
					? { kind: "levelling", rewards: level.rewards.length, boosts: level.boosts.length }
					: null,
				places: at("posts", level.levelUpChannelId),
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
				detail: audit === null ? null : counted("events", audit.enabledLogs.length),
				places: at("logs", audit?.channelId),
			};
		},
	},
	{
		key: "welcome",
		label: "Welcome messages",
		async read(guild) {
			const channelId = (await getWelcome(guild.id))?.channelId ?? null;
			return {
				enabled: channelId !== null,
				detail: channelId === null ? null : posting(channelId),
				places: at("posts", channelId),
			};
		},
	},
	{
		key: "goodbye",
		label: "Goodbye messages",
		async read(guild) {
			const goodbye = await getGoodbyeSettings(guild.id);
			const channelId = goodbye?.enabled === true ? goodbye.channelId : null;
			return {
				enabled: channelId !== null,
				detail: channelId === null ? null : posting(channelId),
				places: at("posts", goodbye?.channelId),
			};
		},
	},
	{
		key: "birthdays",
		label: "Birthdays",
		async read(guild) {
			const [settings, shared] = await Promise.all([getBirthdaySettings(guild.id), countBirthdays(guild.id)]);
			const enabled = settings?.enabled === true && settings.channelId !== null;
			return {
				enabled,
				detail: enabled ? counted("birthdays", shared) : null,
				places: at("posts", settings?.channelId),
			};
		},
	},
	{
		key: "verification",
		label: "Verification",
		async read(guild) {
			const verify = await getVerifyConfig(guild.id);
			return {
				enabled: verify !== null,
				detail: verify === null ? null : counted("verified", verify.verifiedIds.length),
				places: at("panel", verify?.channelId),
			};
		},
	},
	{
		key: "cases",
		label: "Moderation cases",
		async read(guild) {
			const channelId = (await getCaseSettings(guild.id))?.logChannelId ?? null;
			return {
				enabled: channelId !== null,
				detail: channelId === null ? null : posting(channelId),
				places: at("logs", channelId),
			};
		},
	},
	{
		key: "raid-protection",
		label: "Raid protection",
		async read(guild) {
			const raid = await getRaidSettings(guild.id);
			const on = raid?.enabled === true;
			const age = raid?.minAccountAgeDays ?? 0;
			return {
				enabled: on,
				detail: on ? (age > 0 ? { kind: "holding", days: age } : { kind: "watching" }) : null,
				places: at("logs", raid?.alertChannelId),
			};
		},
	},
	{
		key: "anti-link",
		label: "Anti-link",
		async read(guild) {
			const antiLink = await getAntiLink(guild.id);
			return {
				enabled: antiLink !== null,
				detail: antiLink === null ? null : { kind: "bypass", permission: antiLink.bypassPermission },
				places: [],
			};
		},
	},
	{
		key: "counting",
		label: "Counting",
		async read(guild) {
			const counting = await getCounting(guild.id);
			return {
				enabled: counting !== null,
				detail: counting === null ? null : { kind: "countingAt", count: counting.count },
				places: at("listens", counting?.channelId),
			};
		},
	},
	{
		key: "auto-roles",
		label: "Auto roles",
		async read(guild) {
			const roleIds = (await getAutoRoles(guild.id))?.roleIds ?? null;
			return {
				enabled: (roleIds?.length ?? 0) > 0,
				detail: roleIds === null ? null : counted("roles", roleIds.length),
				places: [],
			};
		},
	},
	{
		key: "role-menus",
		label: "Role menus",
		async read(guild) {
			const menus = await listRoleMenus(guild.id);
			return {
				enabled: menus.length > 0,
				detail: menus.length === 0 ? null : counted("menus", menus.length),
				places: at("panel", ...menus.map((menu) => menu.channelId)),
			};
		},
	},
	{
		key: "ideas",
		label: "Idea board",
		async read(guild) {
			const board = await getIdeaSettings(guild.id);
			const on = board?.enabled === true;
			return {
				enabled: on,
				detail: on && board.channelId !== null ? posting(board.channelId) : null,
				places: at("posts", board?.channelId),
			};
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
				detail:
					on && stars.channelId !== null
						? { kind: "starboard", threshold: stars.threshold, channelId: stars.channelId }
						: null,
				places: at("posts", stars?.channelId),
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
				detail: on && lobby.lobbyChannelId !== null ? { kind: "lobby", channelId: lobby.lobbyChannelId } : null,
				places: at("lobby", lobby?.lobbyChannelId),
			};
		},
	},
	{
		key: "voice-stats",
		label: "Voice stats",
		async read(guild) {
			const counter = await getVoiceCounter(guild.id);
			return {
				enabled: counter !== null,
				detail: null,
				places: at("counter", counter?.memberChannelId, counter?.botChannelId),
			};
		},
	},
	{
		key: "sticky",
		label: "Sticky messages",
		async read(guild) {
			const stickies = await listSticky(guild.id);
			return {
				enabled: stickies.length > 0,
				detail: stickies.length === 0 ? null : counted("channels", stickies.length),
				places: at("posts", ...stickies.map((sticky) => sticky.channelId)),
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
				detail: responders.length === 0 ? null : counted("responders", responders.length),
				places: [],
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
				detail: schedules.length === 0 ? null : counted("messages", schedules.length),
				places: at("posts", ...schedules.map((schedule) => schedule.channelId)),
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
				detail: treasure.configured ? { kind: "treasure", min: treasure.minAmount, max: treasure.maxAmount } : null,
				places: [],
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
				detail: tickets.enabled ? counted("ticketsOpen", tickets.openTickets) : null,
				places: [...at("panel", tickets.panelChannelId), ...at("logs", tickets.transcriptChannelId)],
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
				detail: draw.enabled ? counted("ticketsSold", draw.ticketsSold) : null,
				places: at("posts", draw.announcementChannelId),
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
				detail: tables.enabled ? { kind: "casino", open, total: CASINO_GAMES.length } : null,
				places: [],
			};
		},
	},
	{
		key: "bot-stats",
		label: "Bot statistics",
		async read(guild) {
			const stats = await getFixedStats(guild.id);
			return {
				enabled: stats !== null,
				detail: stats === null ? null : posting(stats.channelId),
				places: at("posts", stats?.channelId),
			};
		},
	},
];

/** One place per channel and role, since two scheduled messages in one channel are still one place. */
function distinct(places: Place[]): Place[] {
	const seen = new Set<string>();
	return places.filter((place) => {
		const key = `${place.role}:${place.channelId}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Every feature read at once, in the order the overview lists them, with where each one works. */
export async function placesOf(guild: Guild): Promise<FeaturePlaces[]> {
	return Promise.all(
		FEATURE_SOURCES.map(async (source) => {
			const { places, ...reading } = await source.read(guild);
			return {
				key: source.key,
				label: source.label,
				...reading,
				reach: FEATURE_PLACES[source.key].reach,
				places: distinct(places),
			};
		}),
	);
}

/** The overview's reading of every feature, without where each one works. */
export async function featuresOf(guild: Guild): Promise<FeatureStatus[]> {
	return (await placesOf(guild)).map(({ key, label, enabled, detail }) => ({ key, label, enabled, detail }));
}
