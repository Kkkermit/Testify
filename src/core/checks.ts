import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput, type Subcommand } from "@core/command";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { disabledGlobally, disabledInGuild } from "@database/repositories/commandToggleRepository";
import { getMusicSettings } from "@database/repositories/musicSettingsRepository";
import { formatDuration, humanisePermission } from "@lib/format/format.util";
import { MUSIC_SYSTEM_SUBCOMMAND } from "@lib/music/music.constants";
import { musicRefusal, normaliseMusicSettings } from "@lib/music/musicSettings.util";
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
	if (client.paused) {
		return "Testify is paused right now. The bot owner can resume it from the dashboard.";
	}

	const blacklisted = await findBlacklistEntry(interaction.user.id);
	if (blacklisted) return `You are blocked from using this bot.\nReason: ${blacklisted.reason}`;

	const switchedOff = await checkSwitchedOff(interaction, command);
	if (switchedOff !== null) return switchedOff;

	const musicOff = await checkMusicSystem(interaction, command);
	if (musicOff !== null) return musicOff;

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
	const needed = [...(command.permissions ?? []), ...(chosenSubcommand(interaction, command)?.permissions ?? [])];

	if (needed.length > 0 && member !== null) {
		const missing = permissionsOf(member).missing(new PermissionsBitField(needed));
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

/** Nobody bypasses a switch, the bot owner included. */
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

/** Which subcommand was used, or null — a command with no subcommands answers null the contract cannot express. */
export function chosenSubcommand(interaction: CommandInput, command: Command): Subcommand | null {
	if (command.subcommands === undefined) return null;

	const chosen: string | null = interaction.options.getSubcommand(false);

	return command.subcommands.find((subcommand) => subcommand.name === chosen) ?? null;
}

/** Both shapes a member arrives in carry permissions, and only one of them is already a bitfield. */
function permissionsOf(member: NonNullable<CommandInput["member"]>): PermissionsBitField {
	return typeof member.permissions === "string"
		? new PermissionsBitField(BigInt(member.permissions))
		: new PermissionsBitField(member.permissions);
}

/** A slash interaction hands roles back as a manager; a raw API member hands back the ids themselves. */
function roleIdsOf(member: CommandInput["member"]): string[] {
	if (member === null) return [];
	if (Array.isArray(member.roles)) return member.roles;

	return [...member.roles.cache.keys()];
}

/**
 * The music system's switch and DJ roles, gated here so no music command can forget them; `/music system` is the way
 * back in.
 */
async function checkMusicSystem(interaction: CommandInput, command: Command): Promise<CheckFailure> {
	if (command.category !== "music" || interaction.guildId === null) return null;

	if (chosenSubcommand(interaction, command)?.name === MUSIC_SYSTEM_SUBCOMMAND) return null;

	const settings = normaliseMusicSettings(await getMusicSettings(interaction.guildId));
	const member = interaction.member;

	return musicRefusal(settings, {
		roleIds: roleIdsOf(member),
		manager: member !== null && permissionsOf(member).has(PermissionFlagsBits.ManageGuild),
	});
}

function checkCooldown(interaction: CommandInput, command: Command, client: TestifyClient): CheckFailure {
	if (!command.cooldown || client.isOwner(interaction.user.id)) return null;

	// Per guild, because the features a cooldown protects are per guild.
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
