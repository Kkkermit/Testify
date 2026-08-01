import { PermissionsBitField, type PermissionResolvable } from "discord.js";
import { type Command, type CommandOption, type Subcommand } from "@core/command";
import { humanisePermission } from "@lib/format.util";
import {
	type CommandCatalogue,
	type CommandOptionSummary,
	type CommandSummary,
	type SubcommandSummary,
} from "@testify/shared";

/** Turns the live command registry into the shape the dashboard reads. */

function optionOf(option: CommandOption): CommandOptionSummary {
	return {
		name: option.name,
		description: option.description,
		type: option.type,
		required: option.required ?? false,
		choices: option.choices ?? [],
		min: option.min ?? null,
		max: option.max ?? null,
	};
}

function subcommandOf(subcommand: Subcommand): SubcommandSummary {
	return {
		name: subcommand.name,
		description: subcommand.description,
		aliases: subcommand.aliases ?? [],
		options: (subcommand.options ?? []).map(optionOf),
	};
}

/** Bit flags are meaningless to a reader, so they are resolved to the names Discord shows in its own UI. */
function permissionNames(permissions: PermissionResolvable[] | undefined): string[] {
	if (permissions === undefined || permissions.length === 0) return [];

	return new PermissionsBitField(permissions).toArray().map((name) => humanisePermission(name));
}

export function summariseCommand(command: Command): CommandSummary {
	return {
		name: command.name,
		description: command.description,
		category: command.category,
		aliases: command.aliases ?? [],
		subcommands: (command.subcommands ?? []).map(subcommandOf),
		options: (command.options ?? []).map(optionOf),
		permissions: permissionNames(command.permissions),
		botPermissions: permissionNames(command.botPermissions),
		cooldownMs: command.cooldown ?? null,
		guildOnly: command.guildOnly ?? false,
		ownerOnly: command.ownerOnly ?? false,
		nsfw: command.nsfw ?? false,
	};
}

/**
 * Owner commands are filtered out for everybody else rather than shown and disabled: the list of what a bot's
 * owner can do is not something a server manager needs, and naming them invites probing.
 */
export function buildCatalogue(
	commands: Iterable<Command>,
	options: { prefix: string; includeOwnerOnly: boolean },
): CommandCatalogue {
	const summaries = [...commands]
		.filter((command) => options.includeOwnerOnly || command.ownerOnly !== true)
		.map(summariseCommand)
		.sort((left, right) => left.name.localeCompare(right.name));

	return {
		commands: summaries,
		categories: [...new Set(summaries.map((command) => command.category))].sort((left, right) =>
			left.localeCompare(right),
		),
		prefix: options.prefix,
	};
}
