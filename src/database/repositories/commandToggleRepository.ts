import { CACHE } from "@config/constants";
import { CommandToggleConfig, type CommandToggles } from "@database/models/commandToggles.schema";

/**
 * Which commands are switched off.
 *
 * Read before every single invocation, so it is cached exactly like the prefix is — and every write clears the
 * entry it touched, so a toggle takes effect on the next command rather than in five minutes.
 */

/** The bot-wide row's key. A Discord id is 17-20 digits, so this cannot collide with a real guild. */
export const GLOBAL_SCOPE = "GLOBAL";

const cache = new Map<string, { disabled: string[]; expiresAt: number }>();

function remember(scope: string, disabled: string[]): string[] {
	if (cache.size > CACHE.guildSettingsMaxEntries) cache.clear();
	cache.set(scope, { disabled, expiresAt: Date.now() + CACHE.guildSettingsTtlMs });

	return disabled;
}

export function clearCommandToggleCache(scope?: string): void {
	if (scope === undefined) cache.clear();
	else cache.delete(scope);
}

async function read(scope: string): Promise<string[]> {
	const cached = cache.get(scope);
	if (cached && cached.expiresAt > Date.now()) return cached.disabled;

	const record = await CommandToggleConfig.findOne({ guildId: scope }).lean<CommandToggles>().exec();

	return remember(scope, record?.disabled ?? []);
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

	return remember(scope, unique);
}

export async function purgeCommandToggles(guildId: string): Promise<void> {
	clearCommandToggleCache(guildId);
	await CommandToggleConfig.deleteMany({ guildId }).exec();
}
