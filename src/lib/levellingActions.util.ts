import { type GuildMember, PermissionFlagsBits, type Role } from "discord.js";
import { toError } from "@core/errors";
import { type Logger } from "@core/logger";
import { type LevelConfig, rewardChangeFor } from "@lib/levelling.util";

/**
 * Handing out level reward roles, shared by the message handler and by the admin
 * commands that set a level directly.
 *
 * Nothing here throws. A member sending a message must not see an error because
 * one reward role sits above the bot in the role list, so anything undoable is
 * reported back in `skipped` and logged once.
 */

export interface RewardOutcome {
	added: string[];
	removed: string[];
	/** Roles that could not be touched — deleted, managed, or above the bot. */
	skipped: string[];
}

const EMPTY: RewardOutcome = { added: [], removed: [], skipped: [] };

export async function applyLevelRewards(
	member: GuildMember,
	config: LevelConfig,
	level: number,
	logger?: Logger,
): Promise<RewardOutcome> {
	if (config.rewards.length === 0) return { ...EMPTY };

	const change = rewardChangeFor(config, level, [...member.roles.cache.keys()]);
	if (change.add.length === 0 && change.remove.length === 0) return { ...EMPTY };

	const me = member.guild.members.me;
	if (me?.permissions.has(PermissionFlagsBits.ManageRoles) !== true) {
		logger?.warn(
			{ guildId: member.guild.id },
			"[LEVELLING] Cannot hand out level rewards without the Manage Roles permission. Grant it, or clear the rewards.",
		);

		return { ...EMPTY, skipped: [...change.add, ...change.remove] };
	}

	const ceiling = me.roles.highest.position;
	const outcome: RewardOutcome = { added: [], removed: [], skipped: [] };

	const usable = (roleId: string): Role | null => {
		const role = member.guild.roles.cache.get(roleId) ?? null;
		if (role === null || role.managed || role.position >= ceiling) {
			outcome.skipped.push(roleId);
			return null;
		}

		return role;
	};

	for (const roleId of change.add) {
		const role = usable(roleId);
		if (role === null) continue;

		try {
			await member.roles.add(role, `Reached level ${level}`);
			outcome.added.push(roleId);
		} catch (error) {
			logger?.warn({ err: toError(error), roleId }, "[LEVELLING] Failed to add a level reward role");
			outcome.skipped.push(roleId);
		}
	}

	for (const roleId of change.remove) {
		const role = usable(roleId);
		if (role === null) continue;

		try {
			await member.roles.remove(role, `Superseded at level ${level}`);
			outcome.removed.push(roleId);
		} catch (error) {
			logger?.warn({ err: toError(error), roleId }, "[LEVELLING] Failed to remove a superseded reward role");
			outcome.skipped.push(roleId);
		}
	}

	return outcome;
}
