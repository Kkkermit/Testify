/**
 * The bot's command registry, as the dashboard sees it.
 *
 * This is the same metadata `buildSlashCommand` registers with Discord, so a screen built from it cannot drift
 * from what `/help` lists — and it is what a generated form per command would be built from later.
 */

export const OPTION_TYPES = [
	"string",
	"integer",
	"number",
	"boolean",
	"user",
	"channel",
	"role",
	"attachment",
] as const;

export type CommandOptionType = (typeof OPTION_TYPES)[number];

export interface CommandOptionSummary {
	name: string;
	description: string;
	type: CommandOptionType;
	required: boolean;
	choices: { name: string; value: string | number }[];
	min: number | null;
	max: number | null;
}

export interface SubcommandSummary {
	name: string;
	description: string;
	aliases: string[];
	options: CommandOptionSummary[];
}

export interface CommandSummary {
	name: string;
	description: string;
	category: string;
	/** Extra names the prefix surface answers to. */
	aliases: string[];
	subcommands: SubcommandSummary[];
	options: CommandOptionSummary[];
	/** Human-readable permission names, not raw bit flags. */
	permissions: string[];
	botPermissions: string[];
	cooldownMs: number | null;
	guildOnly: boolean;
	ownerOnly: boolean;
	nsfw: boolean;
}

export interface CommandCatalogue {
	commands: CommandSummary[];
	/** Every category in use, so the browser does not have to derive and sort it. */
	categories: string[];
	prefix: string;
}

export function countSubcommands(commands: CommandSummary[]): number {
	return commands.reduce((total, command) => total + command.subcommands.length, 0);
}

/** Matches a command by its name, an alias, a subcommand name or its description. */
export function matchesSearch(command: CommandSummary, search: string): boolean {
	const term = search.trim().toLowerCase();
	if (term === "") return true;

	const haystack = [
		command.name,
		command.description,
		...command.aliases,
		...command.subcommands.flatMap((subcommand) => [subcommand.name, subcommand.description]),
	];

	return haystack.some((value) => value.toLowerCase().includes(term));
}
