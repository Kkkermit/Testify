import { type Guild, PermissionFlagsBits } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound, notInGuild } from "@api/errors";
import { requireGrantable, requirePermission } from "@api/middleware/reach";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import {
	countRoleMenus,
	createRoleMenu,
	deleteRoleMenu,
	findRoleMenu,
	type StoredRoleMenu,
} from "@database/repositories/roleMenuRepository";
import { changeRoleMenu, offerProblem, publishRoleMenu, readRoleMenus, takeDownRoleMenu } from "@lib/roles";
import { ROLE_MENU_LIMITS, roleMenuBody, roleMenuParams } from "@testify/shared";

export const roleMenus = new Hono<ApiBindings>();

roleMenus.use("*", requireGuild);

/** Handing out roles is what `/role-menu` asks Manage Roles for, so every write here asks the same. */
const manageRoles = requirePermission(PermissionFlagsBits.ManageRoles);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	return guild;
}

async function menuOf(context: Context<ApiBindings>, guild: Guild): Promise<StoredRoleMenu> {
	const { menuId } = parseParams(context, roleMenuParams);
	const menu = await findRoleMenu(guild.id, menuId);
	if (menu === null) throw notFound("role_menu_not_found", "There is no role menu with that id in this server.");

	return menu;
}

roleMenus.get("/", async (context) => context.json(await readRoleMenus(guildOf(context))));

roleMenus.post("/", manageRoles, async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, roleMenuBody);
	requireGrantable(context, body.roleIds, offerProblem);

	if ((await countRoleMenus(guild.id)) >= ROLE_MENU_LIMITS.maxPerGuild) {
		throw badRequest("That is as many menus as a server can have. Delete one to make another.");
	}

	await createRoleMenu(guild.id, body, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "roleMenu.create", summary: `Made the role menu ${body.title}` });

	return context.json(await readRoleMenus(guild));
});

/** A posted menu's post follows the change; when it cannot, the change is still saved and the refusal says so. */
roleMenus.put("/:menuId", manageRoles, async (context) => {
	const guild = guildOf(context);
	const menu = await menuOf(context, guild);
	const body = await parseBody(context, roleMenuBody);
	requireGrantable(context, body.roleIds, offerProblem);

	const result = await changeRoleMenu(guild, menu, body, context.get("session")?.userId ?? null);
	await auditChange(context, { action: "roleMenu.update", summary: `Changed the role menu ${body.title}` });
	if (result.note !== null) throw badRequest(result.note);

	return context.json(await readRoleMenus(guild));
});

roleMenus.post("/:menuId/publish", manageRoles, async (context) => {
	const guild = guildOf(context);
	const menu = await menuOf(context, guild);

	await publishRoleMenu(guild, menu);
	await auditChange(context, { action: "roleMenu.publish", summary: `Posted the role menu ${menu.title}` });

	return context.json(await readRoleMenus(guild));
});

/** Nobody loses a role they picked; the post comes down so no more can be picked from it. */
roleMenus.delete("/:menuId", manageRoles, async (context) => {
	const guild = guildOf(context);
	const menu = await menuOf(context, guild);

	await takeDownRoleMenu(guild, menu);
	await deleteRoleMenu(guild.id, menu.id);
	await auditChange(context, { action: "roleMenu.delete", summary: `Deleted the role menu ${menu.title}` });

	return context.json(await readRoleMenus(guild));
});
