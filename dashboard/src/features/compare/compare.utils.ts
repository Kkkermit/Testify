import { type FeatureStatus, type GuildOverview, type ManageableGuild } from "@testify/shared";

export const COMPARE_LIMITS = {
	/** Past four columns a feature's sentence no longer fits beside its name on a laptop. */
	maxServers: 4,
	firstShown: 3,
} as const;

export function comparable(guilds: readonly ManageableGuild[]): ManageableGuild[] {
	return guilds.filter((guild) => guild.botPresent && guild.canInvite);
}

export function chosenFrom(param: string | null, candidates: readonly ManageableGuild[]): string[] {
	if (param === null) return candidates.slice(0, COMPARE_LIMITS.firstShown).map((guild) => guild.id);

	const known = new Set(candidates.map((guild) => guild.id));
	return [...new Set(param.split(","))].filter((id) => known.has(id)).slice(0, COMPARE_LIMITS.maxServers);
}

export interface CompareRow {
	key: string;
	label: string;
	cells: (FeatureStatus | null | undefined)[];
}

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

/** Leaves out the channel, which two servers can never share. */
function signature(feature: FeatureStatus | null): string {
	if (feature === null) return "absent";
	const detail = feature.detail === null ? null : Object.entries(feature.detail).filter(([key]) => key !== "channelId");
	return JSON.stringify([feature.enabled, detail]);
}

export function rowDiffers(cells: readonly (FeatureStatus | null | undefined)[]): boolean {
	const known = cells.filter((cell) => cell !== undefined);
	return new Set(known.map(signature)).size > 1;
}

export function missingDiffers(overviews: readonly (GuildOverview | undefined)[]): boolean {
	const known = overviews.filter((overview) => overview !== undefined);
	return new Set(known.map((overview) => [...overview.missingPermissions].sort().join(","))).size > 1;
}
