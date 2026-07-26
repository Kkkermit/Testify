import { type AutocompleteInteraction, type PermissionResolvable } from "discord.js";
import { type Category } from "../config/categories";
import { type TestifyClient } from "./client";
import { type CommandContext, type Surface } from "./context";

export type OptionType =
	"string" | "integer" | "number" | "boolean" | "user" | "channel" | "role" | "mentionable" | "attachment";

export interface OptionChoice {
	name: string;
	value: string | number;
}

export interface OptionDefinition {
	name: string;
	description: string;
	type: OptionType;
	required?: boolean;
	choices?: OptionChoice[];
	autocomplete?: boolean;
	minValue?: number;
	maxValue?: number;
	minLength?: number;
	maxLength?: number;
	channelTypes?: number[];
	/** Consumes the remainder of the prefix arguments. String options only. */
	greedy?: boolean;
}

export interface SharedSubcommand {
	name: string;
	description: string;
	options?: OptionDefinition[];
	execute(ctx: CommandContext): Promise<void>;
}

export interface SharedSubcommandGroup {
	name: string;
	description: string;
	subcommands: SharedSubcommand[];
}

/**
 * One implementation, up to two surfaces. Replaces the 46 duplicated
 * slash/prefix command pairs the audit catalogued.
 */
export interface SharedCommand {
	name: string;
	description: string;
	category: Category;
	surfaces: Surface[];

	aliases?: string[];
	options?: OptionDefinition[];
	subcommands?: SharedSubcommand[];
	subcommandGroups?: SharedSubcommandGroup[];

	/** Permissions the invoking user needs. */
	permissions?: PermissionResolvable[];
	/** Permissions the bot needs — never checked at all in the previous codebase. */
	botPermissions?: PermissionResolvable[];
	cooldownMs?: number;
	guildOnly?: boolean;
	ownerOnly?: boolean;
	nsfw?: boolean;
	underDevelopment?: boolean;

	execute(ctx: CommandContext): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void>;
}

/** Identity helper that keeps literal inference on `surfaces` and `category`. */
export function defineCommand(command: SharedCommand): SharedCommand {
	return command;
}

export function hasSurface(command: SharedCommand, surface: Surface): boolean {
	return command.surfaces.includes(surface);
}

/** Flattens subcommands and groups so the help and prefix layers can enumerate them. */
export function allSubcommands(command: SharedCommand): SharedSubcommand[] {
	return [...(command.subcommands ?? []), ...(command.subcommandGroups ?? []).flatMap((group) => group.subcommands)];
}
