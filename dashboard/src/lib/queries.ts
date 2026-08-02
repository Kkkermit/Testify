/** Query keys in one place, so nothing is a hand-written string that a rename can silently miss. */
export const keys = {
	setup: () => ["setup"] as const,
	me: () => ["me"] as const,
	bot: () => ["bot"] as const,
	commands: () => ["commands"] as const,
	/** Null is the bot-wide scope, which only the owner can read. */
	commandToggles: (guildId: string | null) => ["command-toggles", guildId ?? "global"] as const,
	guild: (id: string) => ({
		all: () => ["guild", id] as const,
		overview: () => ["guild", id, "overview"] as const,
		levelling: () => ["guild", id, "levelling"] as const,
		welcome: () => ["guild", id, "welcome"] as const,
		auditLog: () => ["guild", id, "audit-log"] as const,
		settings: () => ["guild", id, "settings"] as const,
		nickname: () => ["guild", id, "nickname"] as const,
		channels: () => ["guild", id, "channels"] as const,
		roles: () => ["guild", id, "roles"] as const,
		audit: (page: number) => ["guild", id, "audit", page] as const,
	}),
	owner: {
		stats: () => ["owner", "stats"] as const,
		guilds: (page: number) => ["owner", "guilds", page] as const,
		usage: (days: number) => ["owner", "usage", days] as const,
		logs: (level: string, search: string) => ["owner", "logs", level, search] as const,
		runtime: () => ["owner", "runtime"] as const,
		control: () => ["owner", "control"] as const,
		guildDetail: (id: string) => ["owner", "guild", id] as const,
	},
};
