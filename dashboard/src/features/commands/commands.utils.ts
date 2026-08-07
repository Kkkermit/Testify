import { type CommandSummary, matchesSearch } from "@testify/shared";

/** Which commands the dashboard can configure, keyed by name; everything unlisted is Discord-only and is what the coverage tile counts. */
const CONFIGURABLE: Record<string, { path: (guildId: string) => string; screen: string }> = {
	levelling: { path: (guildId) => `/guilds/${guildId}/levelling`, screen: "Levelling" },
	rank: { path: (guildId) => `/guilds/${guildId}/levelling`, screen: "Levelling" },
	leaderboard: { path: (guildId) => `/guilds/${guildId}/levelling`, screen: "Levelling" },
	welcome: { path: (guildId) => `/guilds/${guildId}/welcome`, screen: "Welcome" },
	"audit-logging": { path: (guildId) => `/guilds/${guildId}/audit-log`, screen: "Audit logging" },
	prefix: { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	"anti-link": { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	"auto-role": { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	counting: { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	"voice-stats": { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	verify: { path: (guildId) => `/guilds/${guildId}/settings`, screen: "Server settings" },
	sticky: { path: (guildId) => `/guilds/${guildId}/sticky`, screen: "Sticky messages" },
	automod: { path: (guildId) => `/guilds/${guildId}/automod`, screen: "AutoMod" },
	treasure: { path: (guildId) => `/guilds/${guildId}/treasure`, screen: "Treasure drops" },
	ticket: { path: (guildId) => `/guilds/${guildId}/tickets`, screen: "Tickets" },
	lottery: { path: (guildId) => `/guilds/${guildId}/lottery`, screen: "Lottery" },
};

export interface CommandPlace {
	path: string;
	screen: string;
}

export function configurableAt(command: CommandSummary, guildId: string | null): CommandPlace | null {
	const entry = CONFIGURABLE[command.name];
	if (entry === undefined || guildId === null) return null;

	return { path: entry.path(guildId), screen: entry.screen };
}

export function isConfigurable(command: CommandSummary): boolean {
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

/** Grouped for display, in the order the categories arrive so the page and the filter agree. */
export function groupByCategory(commands: CommandSummary[], categories: string[]): [string, CommandSummary[]][] {
	return categories
		.map((category): [string, CommandSummary[]] => [
			category,
			commands.filter((command) => command.category === category),
		])
		.filter(([, group]) => group.length > 0);
}
