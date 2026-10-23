import { isValidObjectId, type Types } from "mongoose";
import { RoleMenu, type RoleMenuRecord } from "@database/models/roleMenu.schema";

/** A role menu as the rest of the bot sees it, with its id as a string. */
export type StoredRoleMenu = Omit<RoleMenuRecord, "createdAt" | "updatedAt"> & { id: string };

export type RoleMenuFields = Pick<RoleMenuRecord, "channelId" | "title" | "description" | "roleIds" | "mode">;

type Lean = RoleMenuRecord & { _id: Types.ObjectId };

function toMenu(row: Lean): StoredRoleMenu {
	return {
		id: row._id.toString(),
		guildId: row.guildId,
		channelId: row.channelId,
		messageId: row.messageId ?? null,
		title: row.title,
		description: row.description,
		roleIds: row.roleIds,
		mode: row.mode,
		updatedBy: row.updatedBy ?? null,
	};
}

/** Every lookup is scoped to the server as well as the id, so one server can never reach another's menu. */
function scope(guildId: string, menuId: string): { guildId: string; _id: string } | null {
	return isValidObjectId(menuId) ? { guildId, _id: menuId } : null;
}

export async function listRoleMenus(guildId: string): Promise<StoredRoleMenu[]> {
	const rows = await RoleMenu.find({ guildId }).sort({ createdAt: 1 }).lean<Lean[]>().exec();
	return rows.map(toMenu);
}

export async function countRoleMenus(guildId: string): Promise<number> {
	return RoleMenu.countDocuments({ guildId }).exec();
}

export async function findRoleMenu(guildId: string, menuId: string): Promise<StoredRoleMenu | null> {
	const filter = scope(guildId, menuId);
	if (filter === null) return null;

	const row = await RoleMenu.findOne(filter).lean<Lean>().exec();
	return row === null ? null : toMenu(row);
}

export async function createRoleMenu(
	guildId: string,
	fields: RoleMenuFields,
	updatedBy: string | null,
): Promise<StoredRoleMenu> {
	const doc = await RoleMenu.create({ guildId, ...fields, messageId: null, updatedBy });
	return toMenu(doc.toObject<Lean>());
}

export async function updateRoleMenu(
	guildId: string,
	menuId: string,
	fields: Partial<RoleMenuFields>,
	updatedBy: string | null,
): Promise<StoredRoleMenu | null> {
	const filter = scope(guildId, menuId);
	if (filter === null) return null;

	const row = await RoleMenu.findOneAndUpdate(filter, { $set: { ...fields, updatedBy } }, { new: true })
		.lean<Lean>()
		.exec();
	return row === null ? null : toMenu(row);
}

export async function setRoleMenuMessage(guildId: string, menuId: string, messageId: string | null): Promise<void> {
	const filter = scope(guildId, menuId);
	if (filter === null) return;

	await RoleMenu.updateOne(filter, { $set: { messageId } }).exec();
}

/** Answers with what was deleted, so the caller can take its post down too. */
export async function deleteRoleMenu(guildId: string, menuId: string): Promise<StoredRoleMenu | null> {
	const filter = scope(guildId, menuId);
	if (filter === null) return null;

	const row = await RoleMenu.findOneAndDelete(filter).lean<Lean>().exec();
	return row === null ? null : toMenu(row);
}

export async function purgeRoleMenus(guildId: string): Promise<void> {
	await RoleMenu.deleteMany({ guildId }).exec();
}
