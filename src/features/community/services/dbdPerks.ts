import { readFileSync } from "node:fs";
import { z } from "zod";
import { jsonPath } from "../../../core/paths";

/**
 * The upstream database is inconsistent: `categories` is sometimes null, and
 * `tunables` is sometimes a sparse array serialised as an index-keyed object.
 * Both are normalised here so the rest of the feature sees one shape.
 */
const tunablesSchema = z
	.union([z.array(z.array(z.string())), z.record(z.string(), z.array(z.string()))])
	.nullish()
	.transform((value): string[][] => {
		if (value === null || value === undefined) return [];
		if (Array.isArray(value)) return value;

		const normalised: string[][] = [];
		for (const [position, values] of Object.entries(value)) {
			normalised[Number.parseInt(position, 10)] = values;
		}
		return normalised;
	});

const perkSchema = z.object({
	name: z.string(),
	description: z.string(),
	role: z.enum(["survivor", "killer"]),
	categories: z
		.array(z.string())
		.nullish()
		.transform((value) => value ?? []),
	tunables: tunablesSchema,
	image: z.string().nullish(),
});

export type DbdPerk = z.output<typeof perkSchema> & { key: string };

interface PerkIndex {
	all: DbdPerk[];
	byKey: Map<string, DbdPerk>;
	byName: Map<string, DbdPerk>;
}

let index: PerkIndex | undefined;

/**
 * The 200 KB perk database is parsed once and indexed into maps. The previous
 * code re-ran two sequential `Object.entries()` scans on every single lookup.
 */
function perkIndex(): PerkIndex {
	if (index) return index;

	const raw: unknown = JSON.parse(readFileSync(jsonPath("dbdPerks.json"), "utf8"));
	const parsed = z.record(z.string(), perkSchema).parse(raw);

	const all: DbdPerk[] = Object.entries(parsed).map(([key, perk]) => ({ ...perk, key }));

	index = {
		all,
		byKey: new Map(all.map((perk) => [perk.key.toLowerCase(), perk])),
		byName: new Map(all.map((perk) => [perk.name.toLowerCase(), perk])),
	};
	return index;
}

export function allPerks(role?: "survivor" | "killer"): DbdPerk[] {
	const perks = perkIndex().all;
	return role === undefined ? perks : perks.filter((perk) => perk.role === role);
}

export function findPerk(query: string): DbdPerk | undefined {
	const needle = query.toLowerCase().trim();
	const perks = perkIndex();

	return (
		perks.byName.get(needle) ??
		perks.byKey.get(needle) ??
		perks.byKey.get(needle.replace(/\s+/g, "_")) ??
		perks.all.find((perk) => perk.name.toLowerCase().includes(needle))
	);
}

export function searchPerks(query: string, role?: "survivor" | "killer", limit = 25): DbdPerk[] {
	const needle = query.toLowerCase().trim();
	return allPerks(role)
		.filter((perk) => perk.name.toLowerCase().includes(needle))
		.slice(0, limit);
}

/**
 * Perk descriptions embed HTML and `{0}`-style tunable placeholders. The tier
 * defaults to the highest value, which is what the in-game tier-three perk shows.
 */
export function renderDescription(perk: DbdPerk, tier = 2): string {
	let text = perk.description;

	perk.tunables.forEach((values, position) => {
		// A normalised sparse array leaves holes, which `forEach` skips anyway.
		const value = values[Math.min(tier, values.length - 1)] ?? values[0] ?? "";
		text = text.replaceAll(`{${position}}`, value);
	});

	return text
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Deterministic four-perk build for a role, using the supplied random source. */
export function randomBuild(role: "survivor" | "killer", pick: (max: number) => number): DbdPerk[] {
	const pool = [...allPerks(role)];
	const build: DbdPerk[] = [];

	while (build.length < 4 && pool.length > 0) {
		const [chosen] = pool.splice(pick(pool.length), 1);
		if (chosen) build.push(chosen);
	}

	return build;
}

/** Test seam — drops the memoised index. */
export function resetPerkIndex(): void {
	index = undefined;
}
