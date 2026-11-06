import { PermissionFlagsBits } from "discord.js";
import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf, readerOf } from "@api/context";
import { requireGrantable, requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { readShopRoles, sellShopRole, withdrawShopRole } from "@lib/economy";
import { offerProblem } from "@lib/roles";
import { shopRoleBody, shopRoleParams } from "@testify/shared";

/** Roles a server sells in its shop; selling one hands it out, so writes ask Manage Roles and the grant rule. */
export const guildShopRoles = new Hono<ApiBindings>();

const manageRoles = requirePermission(PermissionFlagsBits.ManageRoles);

guildShopRoles.use("*", requireGuild);

guildShopRoles.get("/", async (context) => context.json(await readShopRoles(guildOf(context))));

guildShopRoles.put("/:roleId", manageRoles, async (context) => {
	const guild = guildOf(context);
	const { roleId } = parseParams(context, shopRoleParams);
	const { price } = await parseBody(context, shopRoleBody);
	requireGrantable(context, [roleId], offerProblem);

	const roles = await sellShopRole(guild, readerOf(context), roleId, price, context.get("session")?.userId ?? null);
	const name = guild.roles.cache.get(roleId)?.name ?? "a role";
	await auditChange(context, { action: "shopRole.update", summary: `Put ${name} on sale in the shop` });

	return context.json(roles);
});

guildShopRoles.delete("/:roleId", manageRoles, async (context) => {
	const guild = guildOf(context);
	const { roleId } = parseParams(context, shopRoleParams);

	const roles = await withdrawShopRole(guild, roleId);
	const name = guild.roles.cache.get(roleId)?.name ?? "a role";
	await auditChange(context, { action: "shopRole.remove", summary: `Took ${name} off sale in the shop` });

	return context.json(roles);
});
