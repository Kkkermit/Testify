import { z } from "zod";
import { snowflake } from "./schemas";

export const SHOP_ROLE_LIMITS = { max: 10, minPrice: 1, maxPrice: 10_000_000 } as const;

/** A role a server sells in its shop; `problem` says why it cannot be bought right now. */
export interface ShopRole {
	roleId: string;
	name: string | null;
	colour: string | null;
	price: number;
	problem: string | null;
}

export const shopRoleBody = z.object({
	price: z.number().int().min(SHOP_ROLE_LIMITS.minPrice).max(SHOP_ROLE_LIMITS.maxPrice),
});

export const shopRoleParams = z.object({ roleId: snowflake });
