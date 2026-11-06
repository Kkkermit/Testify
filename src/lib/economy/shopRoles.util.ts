import { type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { adjustWallet, debitWallet } from "@database/repositories/economyRepository";
import {
	countShopRoles,
	findShopRole,
	listShopRoles,
	removeShopRole,
	saveShopRole,
} from "@database/repositories/shopRoleRepository";
import { type RoleForSale } from "@lib/economy/economy.types";
import { formatNumber } from "@lib/format/format.util";
import { offerProblem, pickProblem } from "@lib/roles/roleReach.util";
import { SHOP_ROLE_LIMITS, type ShopRole } from "@testify/shared";

/** Roles a server sells in its shop: offered only within the grant rule, and paid for before they are given. */

/** Every role on sale, and why each cannot be bought now; a role since deleted is still listed so it can be taken off. */
export async function readShopRoles(guild: Guild): Promise<ShopRole[]> {
	const stored = await listShopRoles(guild.id);

	return stored.map((entry) => {
		const role = guild.roles.cache.get(entry.roleId);
		return {
			roleId: entry.roleId,
			name: role?.name ?? null,
			colour: role === undefined || role.hexColor === "#000000" ? null : role.hexColor,
			price: entry.price,
			problem: pickProblem(role, guild),
		};
	});
}

/** What the shop's Roles tab shows one member. */
export async function rolesForSale(guild: Guild, member: GuildMember | null): Promise<RoleForSale[]> {
	const roles = await readShopRoles(guild);

	return roles
		.filter((role) => role.name !== null)
		.map((role) => ({
			roleId: role.roleId,
			name: role.name ?? "",
			price: role.price,
			held: member?.roles.cache.has(role.roleId) === true,
			problem: role.problem,
		}));
}

/** Puts a role on sale or changes its price; the person doing it must be able to give it themselves. */
export async function sellShopRole(
	guild: Guild,
	actor: GuildMember | undefined,
	roleId: string,
	price: number,
	updatedBy: string | null,
): Promise<ShopRole[]> {
	const problem = offerProblem(actor, roleId, guild);
	if (problem !== null) throw new UserFacingError(problem);
	if (price < SHOP_ROLE_LIMITS.minPrice || price > SHOP_ROLE_LIMITS.maxPrice) {
		throw new UserFacingError(`A price is between 1 and ${formatNumber(SHOP_ROLE_LIMITS.maxPrice)}.`);
	}
	if ((await findShopRole(guild.id, roleId)) === null && (await countShopRoles(guild.id)) >= SHOP_ROLE_LIMITS.max) {
		throw new UserFacingError(`The shop already sells ${String(SHOP_ROLE_LIMITS.max)} roles. Take one off first.`);
	}

	await saveShopRole(guild.id, roleId, price, updatedBy);
	return readShopRoles(guild);
}

export async function withdrawShopRole(guild: Guild, roleId: string): Promise<ShopRole[]> {
	if (!(await removeShopRole(guild.id, roleId))) throw new UserFacingError("That role is not on sale.");
	return readShopRoles(guild);
}

/** The money moves first and comes back if Discord refuses the role, so nobody pays for a role they never got. */
export async function buyShopRole(guild: Guild, member: GuildMember, roleId: string): Promise<string> {
	const entry = await findShopRole(guild.id, roleId);
	if (entry === null) throw new UserFacingError("That role is no longer for sale.");

	const role = guild.roles.cache.get(roleId);
	const problem = pickProblem(role, guild);
	if (problem !== null || role === undefined) throw new UserFacingError(problem ?? "That role is no longer for sale.");
	if (member.roles.cache.has(roleId)) throw new UserFacingError("You already have that role.");

	if (!(await debitWallet(guild.id, member.id, entry.price))) {
		throw new UserFacingError("You cannot afford that any more.");
	}

	try {
		await member.roles.add(role, "Bought in the shop");
	} catch {
		await adjustWallet(guild.id, member.id, entry.price);
		throw new UserFacingError("Discord refused the role, so your money has been given back.");
	}

	return `You bought the **${role.name}** role for **${formatNumber(entry.price)}**.`;
}
