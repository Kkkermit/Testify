import { type FeatureStatus, type GuildOverview, type ManageableGuild } from "@testify/shared";

export const COMPARE_LIMITS = {
	/** Past four columns a feature's sentence no longer fits beside its name on a laptop. */
	maxServers: 4,
	/** What opens when nothing has been chosen yet. */
	firstShown: 3,
} as const;

/** Servers worth a column: the bot is there and the reader could manage it, which each column then checks live. */
export function comparable(guilds: readonly ManageableGuild[]): ManageableGuild[] {
	return guilds.filter((guild) => guild.botPresent && guild.canInvite);
}

/** The servers in `?servers=`, each one the reader may compare, without repeats; with no parameter, the first few. */
export function chosenFrom(param: string | null, candidates: readonly ManageableGuild[]): string[] {
	if (param === null) return candidates.slice(0, COMPARE_LIMITS.firstShown).map((guild) => guild.id);

	const known = new Set(candidates.map((guild) => guild.id));
	return [...new Set(param.split(","))].filter((id) => known.has(id)).slice(0, COMPARE_LIMITS.maxServers);
}

/** A cell is undefined while its server has not answered, and null when it answered without this feature. */
export interface CompareRow {
	key: string;
	label: string;
	cells: (FeatureStatus | null | undefined)[];
}

/** One row per feature any server reports, in the order the first server to answer lists them. */
export function compareRows(overviews: readonly (GuildOverview | undefined)[]): CompareRow[] {
	const labels = new Map<string, string>();
	for (const overview of overviews) {
		for (const feature of overview?.features ?? [])
			if (!labels.has(feature.key)) labels.set(feature.key, feature.label);
	}

	return [...labels].map(([key, label]) => ({
		key,
		label,
		cells: overviews.map((overview) => overview && (overview.features.find((f) => f.key === key) ?? null)),
	}));
}

/** What a feature is doing, leaving out which channel, because two servers can never share one. */
function signature(feature: FeatureStatus | null): string {
	if (feature === null) return "absent";
	const detail = feature.detail === null ? null : Object.entries(feature.detail).filter(([key]) => key !== "channelId");
	return JSON.stringify([feature.enabled, detail]);
}

/** True when the servers that have answered are not all set up alike; one server alone never differs. */
export function rowDiffers(cells: readonly (FeatureStatus | null | undefined)[]): boolean {
	const known = cells.filter((cell) => cell !== undefined);
	return new Set(known.map(signature)).size > 1;
}

/** The same question for the permissions each server's bot is missing, in any order. */
export function missingDiffers(overviews: readonly (GuildOverview | undefined)[]): boolean {
	const known = overviews.filter((overview) => overview !== undefined);
	return new Set(known.map((overview) => [...overview.missingPermissions].sort().join(","))).size > 1;
}
