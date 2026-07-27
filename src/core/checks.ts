import { PermissionsBitField } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput } from "@core/command";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { formatDuration, humanisePermission } from "@lib/format";

/** Why a command was refused, or null if it may run. */
export type CheckFailure = string | null;

const cooldowns = new Map<string, number>();

/**
 * Everything that can stop a command before it runs, in one place and in order.
 * Returns the message to show the user, or null to let the command through.
 */
export async function runChecks(
	interaction: CommandInput,
	command: Command,
	client: TestifyClient,
): Promise<CheckFailure> {
	const blacklisted = await findBlacklistEntry(interaction.user.id);
	if (blacklisted) return `You are blocked from using this bot.\nReason: ${blacklisted.reason}`;

	if (command.ownerOnly && !client.isOwner(interaction.user.id)) {
		return "This command is only for the bot owner.";
	}

	if (command.guildOnly && !interaction.guild) {
		return "This command only works inside a server.";
	}

	if (command.nsfw) {
		const channel = interaction.channel;
		const isNsfw = channel !== null && "nsfw" in channel && channel.nsfw;
		if (!isNsfw) return "This command only works in age-restricted channels.";
	}

	const member = interaction.member;

	if (command.permissions?.length && member !== null) {
		const held =
			typeof member.permissions === "string"
				? new PermissionsBitField(BigInt(member.permissions))
				: new PermissionsBitField(member.permissions);
		const missing = held.missing(new PermissionsBitField(command.permissions));
		if (missing.length > 0) {
			return `You need these permissions: ${missing.map((p) => `\`${humanisePermission(p)}\``).join(", ")}`;
		}
	}

	if (command.botPermissions?.length && interaction.guild?.members.me) {
		const missing = interaction.guild.members.me.permissions.missing(new PermissionsBitField(command.botPermissions));
		if (missing.length > 0) {
			return `I need these permissions: ${missing.map((p) => `\`${humanisePermission(p)}\``).join(", ")}`;
		}
	}

	return checkCooldown(interaction, command, client);
}

function checkCooldown(interaction: CommandInput, command: Command, client: TestifyClient): CheckFailure {
	if (!command.cooldown || client.isOwner(interaction.user.id)) return null;

	const key = `${command.name}:${interaction.user.id}`;
	const now = Date.now();
	const readyAt = cooldowns.get(key) ?? 0;

	if (readyAt > now) return `Slow down — try again in ${formatDuration(readyAt - now)}.`;

	cooldowns.set(key, now + command.cooldown);
	if (cooldowns.size > 5_000) {
		for (const [entry, expiry] of cooldowns) if (expiry <= now) cooldowns.delete(entry);
	}

	return null;
}

/** Used by the tests, and by `/reset` when clearing state. */
export function clearCooldowns(): void {
	cooldowns.clear();
}
