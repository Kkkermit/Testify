import { type CommandSummary, matchesSearch } from "@testify/shared";
import { type TranslationKey } from "@/i18n";

interface Screen {
	path: (guildId: string) => string;
	labelKey: TranslationKey;
}

const inServer = (screen: string, labelKey: TranslationKey): Screen => ({
	path: (guildId) => `/guilds/${guildId}/${screen}`,
	labelKey,
});

const anywhere = (path: string, labelKey: TranslationKey): Screen => ({ path: () => path, labelKey });

/** Every command with a screen of its own here, named as that screen's title names it. */
const CONFIGURABLE: Record<string, Screen> = {
	levelling: inServer("levelling", "levelling.title"),
	rank: inServer("levelling", "levelling.title"),
	leaderboard: inServer("members", "directory.tabBoards"),
	welcome: inServer("welcome", "welcome.title"),
	birthday: inServer("birthdays", "birthdays.title"),
	"audit-logging": inServer("audit-log", "auditLog.title"),
	prefix: inServer("settings", "settings.title"),
	"anti-link": inServer("settings", "settings.title"),
	"auto-role": inServer("settings", "settings.title"),
	counting: inServer("settings", "settings.title"),
	"voice-stats": inServer("settings", "settings.title"),
	verify: inServer("settings", "settings.title"),
	"sticky-message": inServer("sticky", "sticky.title"),
	"auto-responder": inServer("auto-responders", "autoResponders.title"),
	schedule: inServer("scheduled-messages", "scheduled.title"),
	appeals: inServer("appeals", "appeals.title"),
	modmail: inServer("modmail", "modmail.title"),
	invites: inServer("invites", "invites.title"),
	economy: inServer("economy", "economy.title"),
	idea: inServer("ideas", "ideas.title"),
	starboard: inServer("starboard", "starboard.title"),
	"temp-voice": inServer("temp-voice", "tempVoice.title"),
	"role-menu": inServer("role-menus", "roleMenus.title"),
	automod: inServer("automod", "automod.title"),
	treasure: inServer("treasure", "treasure.title"),
	music: inServer("music", "music.title"),
	casino: inServer("casino", "casino.title"),
	ticket: inServer("tickets", "tickets.title"),
	lottery: inServer("lottery", "lottery.title"),
	giveaway: inServer("giveaways", "giveaways.title"),
	"bot-stats-channel": inServer("bot-stats", "botStats.title"),
	warn: inServer("warnings", "warnings.title"),
	case: inServer("cases", "cases.title"),
	"raid-protection": inServer("raid-protection", "raid.title"),
	kick: inServer("members", "members.title"),
	ban: inServer("members", "members.title"),
	softban: inServer("members", "members.title"),
	mute: inServer("members", "members.title"),
	unmute: inServer("members", "members.title"),
	nickname: inServer("members", "members.title"),
	role: inServer("members", "members.title"),
	give: inServer("members", "members.title"),
	unban: inServer("bans", "bans.title"),
	lock: inServer("channel-tools", "channelTools.title"),
	unlock: inServer("channel-tools", "channelTools.title"),
	slowmode: inServer("channel-tools", "channelTools.title"),
	announce: inServer("announcements", "announcements.title"),
	say: inServer("announcements", "announcements.title"),
	"member-count": inServer("member-count", "memberCount.title"),
	"bot-notifications": anywhere("/notifications", "notices.title"),
	"delete-my-data": anywhere("/account?tab=data", "account.title"),
	profile: anywhere("/account?tab=profile", "account.title"),
	remind: anywhere("/account?tab=reminders", "account.title"),
	blacklist: anywhere("/owner?tab=blacklist", "owner.title"),
	"guild-list": anywhere("/owner?tab=overview", "owner.title"),
};

export interface CommandPlace {
	path: string;
	labelKey: TranslationKey;
}

export function configurableAt(command: CommandSummary, guildId: string | null): CommandPlace | null {
	const entry = CONFIGURABLE[command.name];
	if (entry === undefined || guildId === null) return null;

	return { path: entry.path(guildId), labelKey: entry.labelKey };
}

function isConfigurable(command: CommandSummary): boolean {
	return CONFIGURABLE[command.name] !== undefined;
}

export function coverage(commands: CommandSummary[]): { covered: number; total: number } {
	return { covered: commands.filter(isConfigurable).length, total: commands.length };
}

export function filterCommands(
	commands: CommandSummary[],
	{ search, category }: { search: string; category: string | null },
): CommandSummary[] {
	return commands.filter(
		(command) => (category === null || command.category === category) && matchesSearch(command, search),
	);
}

export function groupByCategory(commands: CommandSummary[], categories: string[]): [string, CommandSummary[]][] {
	return categories
		.map((category): [string, CommandSummary[]] => [
			category,
			commands.filter((command) => command.category === category),
		])
		.filter(([, group]) => group.length > 0);
}
