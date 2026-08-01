import { type CommandSummary, matchesSearch } from "@testify/shared";

/**
 * Which commands the dashboard can already configure, keyed by command name.
 *
 * The value is the settings screen that replaces it — `path` takes the server being configured. Everything not
 * listed is still Discord-only, and the page says so rather than pretending otherwise, so this map doubles as
 * the visible progress toward covering the whole command surface.
 */
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
