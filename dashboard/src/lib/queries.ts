/** Query keys in one place, so nothing is a hand-written string that a rename can silently miss. */
export const keys = {
	setup: () => ["setup"] as const,
	me: () => ["me"] as const,
	guild: (id: string) => ({
		all: () => ["guild", id] as const,
		overview: () => ["guild", id, "overview"] as const,
		channels: () => ["guild", id, "channels"] as const,
		roles: () => ["guild", id, "roles"] as const,
		audit: (page: number) => ["guild", id, "audit", page] as const,
	}),
	owner: {
		stats: () => ["owner", "stats"] as const,
		guilds: (page: number) => ["owner", "guilds", page] as const,
	},
};
