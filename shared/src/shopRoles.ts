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

/** What the shop sells, and whether the person reading may change it, which asks Manage Roles as `/economy shop-role` does. */
export interface ShopRoleList {
	roles: ShopRole[];
	canManage: boolean;
}

export const shopRoleBody = z.object({
	price: z.number().int().min(SHOP_ROLE_LIMITS.minPrice).max(SHOP_ROLE_LIMITS.maxPrice),
});

export const shopRoleParams = z.object({ roleId: snowflake });
