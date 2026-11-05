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
	aliases: string[];
	subcommands: SubcommandSummary[];
	options: CommandOptionSummary[];
	permissions: string[];
	botPermissions: string[];
	cooldownMs: number | null;
	guildOnly: boolean;
	ownerOnly: boolean;
	nsfw: boolean;
}

export interface CommandCatalogue {
	commands: CommandSummary[];
	categories: string[];
	prefix: string;
}

export function countSubcommands(commands: CommandSummary[]): number {
	return commands.reduce((total, command) => total + command.subcommands.length, 0);
}

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
