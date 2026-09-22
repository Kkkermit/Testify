import {
	getMusicSettings,
	saveMusicSettings,
	type StoredMusicSettings,
} from "@database/repositories/musicSettingsRepository";
import { MUSIC_LIMITS, type MusicPatch, type MusicSettings } from "@testify/shared";

/** Who is allowed to drive the player in a server, and whether it runs there at all. */

export { MUSIC_LIMITS };

/** A server with no record gets the system on and open to everybody, which is what a fresh install expects. */
export function normaliseMusicSettings(stored: StoredMusicSettings): MusicSettings {
	return {
		enabled: stored?.enabled ?? true,
		djRoleIds: stored?.djRoleIds ?? [],
		configured: stored !== null,
	};
}

/** No roles chosen means the player is open; otherwise one of them is the ticket. */
export function isDj(settings: Pick<MusicSettings, "djRoleIds">, roleIds: readonly string[]): boolean {
	if (settings.djRoleIds.length === 0) return true;

	return settings.djRoleIds.some((roleId) => roleIds.includes(roleId));
}

/**
 * Why the music system refused, or null when it did not.
 *
 * `manager` is what keeps a server from locking itself out: whoever can configure the bot can always reach the
 * player, however the roles are set.
 */
export function musicRefusal(
	settings: MusicSettings,
	member: { roleIds: readonly string[]; manager: boolean },
): string | null {
	if (!settings.enabled) {
		return "The music system is switched off in this server. Anybody with Manage Server can turn it back on with `/music system`.";
	}

	if (member.manager || isDj(settings, member.roleIds)) return null;

	return "You need a DJ role to use the music commands here. Ask somebody with Manage Server which role that is.";
}

export async function readMusicSettings(guildId: string): Promise<MusicSettings> {
	return normaliseMusicSettings(await getMusicSettings(guildId));
}

/** Writes only what the patch carries, so a role change cannot silently flip the switch beside it. */
export async function applyMusicSettings(
	guildId: string,
	patch: MusicPatch,
	actorId: string | null,
): Promise<MusicSettings> {
	const current = await readMusicSettings(guildId);
	const next: MusicSettings = {
		enabled: patch.enabled ?? current.enabled,
		djRoleIds: (patch.djRoleIds ?? current.djRoleIds).slice(0, MUSIC_LIMITS.maxDjRoles),
		configured: true,
	};

	await saveMusicSettings(guildId, { enabled: next.enabled, djRoleIds: next.djRoleIds }, actorId);

	return next;
}
