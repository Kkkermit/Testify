import { ShopRoleEntry, type ShopRoleRecord } from "@database/models/shopRole.schema";

export type StoredShopRole = Pick<ShopRoleRecord, "roleId" | "price">;

export async function listShopRoles(guildId: string): Promise<StoredShopRole[]> {
	return ShopRoleEntry.find({ guildId })
		.sort({ price: 1, roleId: 1 })
		.select("roleId price")
		.lean<StoredShopRole[]>()
		.exec();
}

export async function findShopRole(guildId: string, roleId: string): Promise<StoredShopRole | null> {
	return ShopRoleEntry.findOne({ guildId, roleId }).select("roleId price").lean<StoredShopRole>().exec();
}

export async function saveShopRole(
	guildId: string,
	roleId: string,
	price: number,
	updatedBy: string | null,
): Promise<void> {
	await ShopRoleEntry.updateOne({ guildId, roleId }, { $set: { price, updatedBy } }, { upsert: true }).exec();
}

export async function removeShopRole(guildId: string, roleId: string): Promise<boolean> {
	const result = await ShopRoleEntry.deleteOne({ guildId, roleId }).exec();
	return result.deletedCount > 0;
}

export async function countShopRoles(guildId: string): Promise<number> {
	return ShopRoleEntry.countDocuments({ guildId }).exec();
}

export async function purgeShopRoles(guildId: string): Promise<void> {
	await ShopRoleEntry.deleteMany({ guildId }).exec();
}
