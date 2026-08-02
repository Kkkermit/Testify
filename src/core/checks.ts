import { PermissionsBitField } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput } from "@core/command";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { disabledGlobally, disabledInGuild } from "@database/repositories/commandToggleRepository";
import { formatDuration, humanisePermission } from "@lib/format.util";
import { isAlwaysEnabled } from "@testify/shared";

/** Why a command was refused, or null if it may run. */
export type CheckFailure = string | null;

const cooldowns = new Map<string, number>();

/** Everything that can stop a command before it runs, in one place and in order. */
export async function runChecks(
	interaction: CommandInput,
	command: Command,
	client: TestifyClient,
): Promise<CheckFailure> {
	const blacklisted = await findBlacklistEntry(interaction.user.id);
	if (blacklisted) return `You are blocked from using this bot.\nReason: ${blacklisted.reason}`;

	const switchedOff = await checkSwitchedOff(interaction, command);
	if (switchedOff !== null) return switchedOff;

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

/**
 * Nobody bypasses a switch, the bot owner included: "off" that quietly still runs for one person is a worse
 * thing to debug than one that is simply off, and the dashboard is one click away for whoever turned it off.
 */
async function checkSwitchedOff(interaction: CommandInput, command: Command): Promise<CheckFailure> {
	if (isAlwaysEnabled(command.name)) return null;

	if ((await disabledGlobally()).includes(command.name)) {
		return "That command is switched off. The bot owner can turn it back on from the dashboard.";
	}

	if (interaction.guildId !== null && (await disabledInGuild(interaction.guildId)).includes(command.name)) {
		return "That command is switched off in this server. Anybody with Manage Server can turn it back on.";
	}

	return null;
}

function checkCooldown(interaction: CommandInput, command: Command, client: TestifyClient): CheckFailure {
	if (!command.cooldown || client.isOwner(interaction.user.id)) return null;

	// Scoped per guild: economy, levelling and every other stateful feature is
	// per-guild, so a global key would let a cooldown earned in one server block
	// the same command in another.
	const key = `${interaction.guildId ?? "dm"}:${command.name}:${interaction.user.id}`;
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
