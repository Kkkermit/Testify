import { AutoRole, type AutoRoleSettings } from "@database/models/autoRole.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getAutoRoles(guildId: string): Promise<AutoRoleSettings | null> {
	return AutoRole.findOne({ guildId }).lean<AutoRoleSettings>().exec();
}

/** Replaces the whole list, which is what a pre-ticked role menu hands back. */
export async function setAutoRoles(guildId: string, roleIds: string[]): Promise<AutoRoleSettings> {
	return AutoRole.findOneAndUpdate({ guildId }, { $set: { roleIds } }, UPSERT).exec() as Promise<AutoRoleSettings>;
}

export async function purgeAutoRoles(guildId: string): Promise<void> {
	await AutoRole.deleteMany({ guildId }).exec();
}
