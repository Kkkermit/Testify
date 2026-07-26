import { z } from "zod";
import { fetchJson } from "./http";

/**
 * Public Valorant catalogue data only.
 *
 * The previous integration signed users in to Riot with their account
 * credentials and stored the resulting access and entitlement tokens in plaintext
 * so it could read their in-game store. Asking users to hand a bot their Riot
 * password is not something this bot should do, so the store feature is gone and
 * the public catalogue endpoints — which need no credentials — took its place.
 */

const BASE = "https://valorant-api.com/v1";

const agentSchema = z.object({
	uuid: z.string(),
	displayName: z.string(),
	description: z.string(),
	developerName: z.string().nullable(),
	displayIcon: z.string().nullable(),
	fullPortrait: z.string().nullable(),
	role: z.object({ displayName: z.string(), description: z.string() }).nullable(),
	abilities: z.array(
		z.object({ slot: z.string(), displayName: z.string().nullable(), description: z.string().nullable() }),
	),
	isPlayableCharacter: z.boolean(),
});

const weaponSchema = z.object({
	uuid: z.string(),
	displayName: z.string(),
	displayIcon: z.string().nullable(),
	shopData: z.object({ cost: z.number(), category: z.string(), categoryText: z.string() }).nullable(),
	weaponStats: z.object({ fireRate: z.number(), magazineSize: z.number(), reloadTimeSeconds: z.number() }).nullable(),
});

const mapSchema = z.object({
	uuid: z.string(),
	displayName: z.string(),
	coordinates: z.string().nullable(),
	splash: z.string().nullable(),
	displayIcon: z.string().nullable(),
});

const listSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ status: z.number(), data: z.array(item) });

export type ValorantAgent = z.infer<typeof agentSchema>;
export type ValorantWeapon = z.infer<typeof weaponSchema>;
export type ValorantMap = z.infer<typeof mapSchema>;

export async function fetchAgents(): Promise<ValorantAgent[]> {
	const payload = await fetchJson("valorant-api", `${BASE}/agents`, listSchema(agentSchema), {
		query: { isPlayableCharacter: true },
	});
	return payload.data;
}

export async function fetchWeapons(): Promise<ValorantWeapon[]> {
	const payload = await fetchJson("valorant-api", `${BASE}/weapons`, listSchema(weaponSchema));
	return payload.data;
}

export async function fetchMaps(): Promise<ValorantMap[]> {
	const payload = await fetchJson("valorant-api", `${BASE}/maps`, listSchema(mapSchema));
	return payload.data;
}
