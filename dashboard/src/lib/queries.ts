/** Query keys in one place, so nothing is a hand-written string that a rename can silently miss. */
export const keys = {
	setup: () => ["setup"] as const,
	me: () => ["me"] as const,
	bot: () => ["bot"] as const,
	commands: () => ["commands"] as const,
	guild: (id: string) => ({
		all: () => ["guild", id] as const,
		overview: () => ["guild", id, "overview"] as const,
		levelling: () => ["guild", id, "levelling"] as const,
		welcome: () => ["guild", id, "welcome"] as const,
		auditLog: () => ["guild", id, "audit-log"] as const,
		channels: () => ["guild", id, "channels"] as const,
		roles: () => ["guild", id, "roles"] as const,
		audit: (page: number) => ["guild", id, "audit", page] as const,
	}),
	owner: {
		stats: () => ["owner", "stats"] as const,
		guilds: (page: number) => ["owner", "guilds", page] as const,
		usage: (days: number) => ["owner", "usage", days] as const,
		logs: (level: string) => ["owner", "logs", level] as const,
		runtime: () => ["owner", "runtime"] as const,
	},
};
