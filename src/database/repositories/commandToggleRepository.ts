import { CommandToggleConfig, type CommandToggles } from "@database/models/commandToggles.schema";
import { ReadCache } from "@database/readCache.util";

/** Which commands are switched off; cached like the prefix, and each write replaces the entry it touched. */

/** The bot-wide row's key. A Discord id is 17-20 digits, so this cannot collide with a real guild. */
export const GLOBAL_SCOPE = "GLOBAL";

const cache = new ReadCache<string[]>();

async function read(scope: string): Promise<string[]> {
	return cache.read(scope, async () => {
		const record = await CommandToggleConfig.findOne({ guildId: scope }).lean<CommandToggles>().exec();
		return record?.disabled ?? [];
	});
}

export async function disabledGlobally(): Promise<string[]> {
	return read(GLOBAL_SCOPE);
}

export async function disabledInGuild(guildId: string): Promise<string[]> {
	return read(guildId);
}

/** Replaces the whole list, because the control is a set of switches whose value *is* the list. */
export async function setDisabled(scope: string, disabled: string[], updatedBy: string | null): Promise<string[]> {
	const unique = [...new Set(disabled)];

	await CommandToggleConfig.findOneAndUpdate(
		{ guildId: scope },
		{ $set: { disabled: unique, updatedBy } },
		{ upsert: true, new: true, lean: true, setDefaultsOnInsert: true },
	).exec();

	return cache.set(scope, unique);
}

export async function purgeCommandToggles(guildId: string): Promise<void> {
	await CommandToggleConfig.deleteMany({ guildId }).exec();
	cache.forget(guildId);
}
