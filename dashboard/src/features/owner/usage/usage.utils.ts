import {
	type AutomaticAction,
	type ChangeWay,
	COMMAND_NAME,
	FUNNEL_LIMITS,
	type MEMBER_TIERS,
	type MusicReason,
	type RefusalReason,
	type SupportWay,
} from "@testify/shared";
import { type TFunction } from "i18next";
import { LOCALES, type TranslationKey } from "@/i18n";
import { formatUnit } from "@/lib/intl";
import { oneOf } from "@/lib/oneOf";

export const USAGE_VIEWS = [
	"commands",
	"people",
	"servers",
	"panels",
	"activity",
	"reliability",
	"journeys",
	"runs",
] as const;

export type UsageView = (typeof USAGE_VIEWS)[number];

export const viewFrom = (raw: string | null): UsageView => oneOf(USAGE_VIEWS, raw, "commands");

export const VIEW_LABELS: Record<UsageView, TranslationKey> = {
	commands: "owner.usageSections.viewCommands",
	people: "owner.usageSections.viewPeople",
	servers: "owner.usageSections.viewServers",
	panels: "owner.usageSections.viewPanels",
	activity: "owner.usageSections.viewActivity",
	reliability: "owner.usageSections.viewReliability",
	journeys: "owner.usageSections.viewJourneys",
	runs: "owner.usageSections.viewRuns",
};

export const TIER_LABELS: Record<(typeof MEMBER_TIERS)[number], TranslationKey> = {
	admin: "owner.usageSections.tierAdmin",
	manager: "owner.usageSections.tierManager",
	member: "owner.usageSections.tierMember",
	dm: "owner.usageSections.tierDm",
};

/** Discord's interaction contexts, which arrive as their numbers. */
export const CONTEXT_LABELS: Record<string, TranslationKey> = {
	"0": "owner.usageSections.contextServer",
	"1": "owner.usageSections.contextBotDm",
	"2": "owner.usageSections.contextOtherDm",
};

export const LIFETIME_LABELS: Record<string, TranslationKey> = {
	"<1d": "owner.usageSections.lifetimeDay",
	"1-7d": "owner.usageSections.lifetimeWeek",
	"7-30d": "owner.usageSections.lifetimeMonth",
	"30-90d": "owner.usageSections.lifetimeQuarter",
	"90d+": "owner.usageSections.lifetimeLonger",
};

export const REFUSAL_LABELS: Record<RefusalReason, TranslationKey> = {
	owner_only: "owner.usageSections.refusalOwnerOnly",
	paused: "owner.usageSections.refusalPaused",
	blacklisted: "owner.usageSections.refusalBlacklisted",
	off_everywhere: "owner.usageSections.refusalOffEverywhere",
	off_here: "owner.usageSections.refusalOffHere",
	feature_off: "owner.usageSections.refusalFeatureOff",
	no_subcommand: "owner.usageSections.refusalNoSubcommand",
	music: "owner.usageSections.refusalMusic",
	casino: "owner.usageSections.refusalCasino",
	guild_only: "owner.usageSections.refusalGuildOnly",
	nsfw_only: "owner.usageSections.refusalNsfwOnly",
	you_lack: "owner.usageSections.refusalYouLack",
	bot_lacks: "owner.usageSections.refusalBotLacks",
	cooldown: "owner.usageSections.refusalCooldown",
};

export const MUSIC_REASON_LABELS: Record<MusicReason, TranslationKey> = {
	forbidden: "owner.usageSections.musicForbidden",
	"bot-check": "owner.usageSections.musicBotCheck",
	session: "owner.usageSections.musicSession",
	unavailable: "owner.usageSections.musicUnavailable",
	drm: "owner.usageSections.musicDrm",
	disk: "owner.usageSections.musicDisk",
	unplayable: "owner.usageSections.musicUnplayable",
	broken: "owner.usageSections.musicBroken",
	error: "owner.usageSections.musicError",
};

/** Services are named as they name themselves, in every language. */
const SOURCE_NAMES: Record<string, string> = { youtube: "YouTube", soundcloud: "SoundCloud", spotify: "Spotify" };

export const sourceName = (source: string, t: TFunction): string =>
	SOURCE_NAMES[source] ?? t("owner.usageSections.otherSource");

export const SUPPORT_WAY_LABELS: Record<SupportWay, TranslationKey> = {
	model: "owner.usageSections.byModel",
	search: "owner.usageSections.bySearch",
	picked: "owner.usageSections.byPicked",
};

export const CHANGE_WAY_LABELS: Record<ChangeWay, TranslationKey> = {
	save: "owner.usageSections.waySave",
	put_back: "owner.usageSections.wayPutBack",
	backup: "owner.usageSections.wayBackup",
	setup: "owner.usageSections.waySetup",
};

export const ACTION_LABELS: Record<AutomaticAction, TranslationKey> = {
	auto_reply: "owner.usageSections.actionAutoReply",
	link_deleted: "owner.usageSections.actionLinkDeleted",
	level_up: "owner.usageSections.actionLevelUp",
	star_post: "owner.usageSections.actionStarPost",
	reminder_sent: "owner.usageSections.actionReminder",
	schedule_post: "owner.usageSections.actionSchedule",
	birthday_post: "owner.usageSections.actionBirthday",
	raid_hold: "owner.usageSections.actionRaidHold",
};

/** A key the table knows, translated; anything newer than the page is shown as the server sent it. */
export function labelOf<K extends string>(
	table: Partial<Record<K, TranslationKey>>,
	key: string,
	t: TFunction,
): string {
	const known = (table as Partial<Record<string, TranslationKey>>)[key];
	return known === undefined ? key : t(known);
}

/** Whether a Discord language has one of the dashboard's translations, by its base. */
export function isTranslated(tag: string): boolean {
	const base = tag.split("-")[0]?.toLowerCase() ?? "";
	return (LOCALES as readonly string[]).includes(base);
}

const HEAT_LEVELS = 4;

/** How dark a cell is, from 0 for nothing to 4 for the busiest hour in the grid. */
export function heatLevel(count: number, max: number): number {
	if (count <= 0 || max <= 0) return 0;
	return Math.max(1, Math.ceil((count / max) * HEAT_LEVELS));
}

export function commandFrom(raw: string | null): string | null {
	return raw !== null && COMMAND_NAME.test(raw) ? raw : null;
}

/** The funnel's slots from the address, a blank one kept in its place so a choice stays where it was made. */
export function stepsFrom(raw: string | null): (string | null)[] {
	const slots = (raw ?? "")
		.split(",")
		.slice(0, FUNNEL_LIMITS.maxSteps)
		.map((step) => commandFrom(step.trim()));
	while (slots.length < FUNNEL_LIMITS.minSteps) slots.push(null);
	return slots;
}

/** The commands chosen so far, in order, once there are enough to follow. */
export function chosenSteps(slots: (string | null)[]): string[] | null {
	const chosen = slots.filter((slot): slot is string => slot !== null);
	return chosen.length >= FUNNEL_LIMITS.minSteps ? chosen : null;
}

export function formatWait(seconds: number): string {
	if (seconds < 60) return formatUnit(seconds, "second", { digits: seconds < 10 ? 1 : 0 });
	if (seconds < 3_600) return formatUnit(seconds / 60, "minute", { digits: 0 });
	if (seconds < 86_400) return formatUnit(seconds / 3_600, "hour", { digits: 1 });
	return formatUnit(seconds / 86_400, "day", { digits: 1 });
}
