import {
	type APIInteractionGuildMember,
	type ChatInputCommandInteraction,
	type AutocompleteInteraction,
	type Client,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	InteractionContextType,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	type PermissionResolvable,
	PermissionsBitField,
	type Role,
	type SlashCommandAttachmentOption,
	type SlashCommandBooleanOption,
	SlashCommandBuilder,
	type SlashCommandChannelOption,
	type SlashCommandIntegerOption,
	type SlashCommandNumberOption,
	type SlashCommandRoleOption,
	type SlashCommandStringOption,
	type SlashCommandUserOption,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
	type TextBasedChannel,
	type User,
} from "discord.js";
import { type Category } from "@config/categories";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";

/**
 * What a command is allowed to ask of whoever invoked it.
 *
 * A slash interaction satisfies this, and so does `PrefixInteraction` in
 * `core/prefix.ts`. That is the whole trick: commands are written once against
 * this shape and work as both `/ban` and `t?ban`. Adding something here means
 * teaching the prefix side to answer it too, which is deliberate.
 */
export interface CommandInput {
	readonly user: User;
	readonly member: GuildMember | APIInteractionGuildMember | null;
	readonly guild: Guild | null;
	readonly guildId: string | null;
	readonly channel: TextBasedChannel | null;
	readonly client: Client;
	readonly commandName: string;
	readonly deferred: boolean;
	readonly replied: boolean;

	readonly options: CommandInputOptions;

	deferReply(options?: { flags?: unknown }): Promise<unknown>;
	reply(options: InteractionReplyOptions): Promise<unknown>;
	editReply(options: InteractionEditReplyOptions | string): Promise<unknown>;
	followUp(options: InteractionReplyOptions): Promise<unknown>;
	fetchReply(): Promise<{ id: string }>;
}

/** The option getters, in both their "give me it or null" and "it must be there" forms. */
export interface CommandInputOptions {
	getSubcommand(required?: boolean): string;
	getString(name: string, required: true): string;
	getString(name: string, required?: boolean): string | null;
	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: boolean): number | null;
	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: boolean): number | null;
	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: boolean): boolean | null;
	getUser(name: string, required: true): User;
	getUser(name: string, required?: boolean): User | null;
	getChannel(name: string, required: true): { id: string; name: string | null };
	getChannel(name: string, required?: boolean): { id: string; name: string | null } | null;
	getRole(name: string, required: true): { id: string; name: string };
	getRole(name: string, required?: boolean): { id: string; name: string } | null;
	getAttachment(name: string, required?: boolean): { url: string } | null;
}

/**
 * A command option. Simpler than chaining SlashCommandBuilder calls, and the
 * loader turns it into the real thing for you.
 */
export interface CommandOption {
	name: string;
	description: string;
	type: "string" | "integer" | "number" | "boolean" | "user" | "channel" | "role" | "attachment";
	required?: boolean;
	choices?: { name: string; value: string | number }[];
	autocomplete?: boolean;
	min?: number;
	max?: number;
	maxLength?: number;
}

export interface Subcommand {
	name: string;
	description: string;
	options?: CommandOption[];
	/** Prefix-only short forms, so `t?meme` still works after `/lookup meme`. */
	aliases?: string[];
	run(interaction: CommandInput, client: TestifyClient): Promise<void>;
}

/**
 * One command. Drop a file exporting one of these into `src/commands/<category>/`
 * and it is picked up automatically — there is nothing to register by hand.
 */
export interface Command {
	name: string;
	description: string;
	category: Category;

	options?: CommandOption[];
	subcommands?: Subcommand[];

	/** Extra names this command answers to as a prefix command, e.g. `["bal"]`. */
	aliases?: string[];

	/** Permissions the person running it needs. */
	permissions?: PermissionResolvable[];
	/** Permissions the bot needs. Checked before the command runs. */
	botPermissions?: PermissionResolvable[];
	/** Milliseconds a user must wait between uses. */
	cooldown?: number;
	/** Only usable inside a server. */
	guildOnly?: boolean;
	/** Only usable by the IDs in DISCORD_OWNER_IDS. */
	ownerOnly?: boolean;
	/** Only usable in age-restricted channels. */
	nsfw?: boolean;

	/** Optional when the command is nothing but subcommands. */
	run?(interaction: CommandInput, client: TestifyClient): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void>;
}

/**
 * Proof that a real slash interaction satisfies the contract. If someone widens
 * `CommandInput` beyond what discord.js provides, this line stops compiling.
 */
const _slashSatisfiesCommandInput: (interaction: ChatInputCommandInteraction) => CommandInput = (interaction) =>
	interaction;
void _slashSatisfiesCommandInput;

/** Wraps a command so TypeScript checks it as you write it. */
export function defineCommand(command: Command): Command {
	return command;
}

export function subcommandsOf(command: Command): Subcommand[] {
	return command.subcommands ?? [];
}

/**
 * Exposes a standalone command as a subcommand of another. Used to keep the
 * command count under Discord's limit of 100 without rewriting the commands
 * themselves — see `src/commands/fun/fun.ts` for the pattern.
 *
 * The file being folded in lives in a `subcommands/` folder, which the loader's
 * `commands/*­/*.command.ts` glob does not reach, so it is not also registered as a
 * command in its own right.
 */
export function asSubcommand(command: Command, aliases: string[] = []): Subcommand {
	if (command.subcommands?.length) {
		throw new Error(`${command.name} already has subcommands, and Discord only allows one level of nesting.`);
	}
	if (!command.run) throw new Error(`${command.name} has no run function to fold in.`);

	return {
		name: command.name,
		description: command.description,
		...(command.options ? { options: command.options } : {}),
		// The command keeps its old name as a prefix alias, so folding `/meme` into
		// `/lookup meme` does not break `t?meme`.
		aliases: [command.name, ...(command.aliases ?? []), ...aliases],
		run: async (interaction, client) => command.run?.(interaction, client),
	};
}

/**
 * Sends the interaction to the right handler. A command made only of
 * subcommands does not need a top-level `run` — this finds the one Discord says
 * was used and calls it.
 */
export async function dispatch(interaction: CommandInput, command: Command, client: TestifyClient): Promise<void> {
	const subcommands = subcommandsOf(command);

	if (subcommands.length > 0) {
		const chosen = interaction.options.getSubcommand(false);
		const subcommand = subcommands.find((candidate) => candidate.name === chosen);
		if (subcommand) {
			await subcommand.run(interaction, client);
			return;
		}
	}

	if (!command.run) {
		throw new UserFacingError(`Pick a subcommand: ${subcommands.map((sub) => `\`${sub.name}\``).join(", ")}.`);
	}

	await command.run(interaction, client);
}

/** Turns a command into the payload Discord expects. */
export function buildSlashCommand(
	command: Command,
): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder {
	const builder = new SlashCommandBuilder().setName(command.name).setDescription(command.description);

	builder.setContexts(
		command.guildOnly
			? [InteractionContextType.Guild]
			: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
	);

	if (command.nsfw) builder.setNSFW(true);
	if (command.permissions?.length) {
		builder.setDefaultMemberPermissions(new PermissionsBitField(command.permissions).bitfield);
	}

	for (const option of command.options ?? []) addOption(builder, option);

	for (const sub of command.subcommands ?? []) {
		builder.addSubcommand((subBuilder) => {
			subBuilder.setName(sub.name).setDescription(sub.description);
			for (const option of sub.options ?? []) addOption(subBuilder, option);
			return subBuilder;
		});
	}

	return builder;
}

/** What both `SlashCommandBuilder` and `SlashCommandSubcommandBuilder` can do. */
interface OptionHost {
	addStringOption(build: (option: SlashCommandStringOption) => SlashCommandStringOption): unknown;
	addIntegerOption(build: (option: SlashCommandIntegerOption) => SlashCommandIntegerOption): unknown;
	addNumberOption(build: (option: SlashCommandNumberOption) => SlashCommandNumberOption): unknown;
	addBooleanOption(build: (option: SlashCommandBooleanOption) => SlashCommandBooleanOption): unknown;
	addUserOption(build: (option: SlashCommandUserOption) => SlashCommandUserOption): unknown;
	addChannelOption(build: (option: SlashCommandChannelOption) => SlashCommandChannelOption): unknown;
	addRoleOption(build: (option: SlashCommandRoleOption) => SlashCommandRoleOption): unknown;
	addAttachmentOption(build: (option: SlashCommandAttachmentOption) => SlashCommandAttachmentOption): unknown;
}

function addOption(host: OptionHost, option: CommandOption): void {
	const required = option.required ?? false;

	switch (option.type) {
		case "string":
			host.addStringOption((builder) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.maxLength !== undefined) builder.setMaxLength(option.maxLength);
				if (option.autocomplete) builder.setAutocomplete(true);
				else if (option.choices) {
					builder.addChoices(...option.choices.map((c) => ({ name: c.name, value: String(c.value) })));
				}
				return builder;
			});
			return;

		case "integer":
			host.addIntegerOption((builder) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.min !== undefined) builder.setMinValue(option.min);
				if (option.max !== undefined) builder.setMaxValue(option.max);
				if (option.autocomplete) builder.setAutocomplete(true);
				else if (option.choices) {
					builder.addChoices(...option.choices.map((c) => ({ name: c.name, value: Number(c.value) })));
				}
				return builder;
			});
			return;

		case "number":
			host.addNumberOption((builder) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.min !== undefined) builder.setMinValue(option.min);
				if (option.max !== undefined) builder.setMaxValue(option.max);
				return builder;
			});
			return;

		case "boolean":
			host.addBooleanOption((b) => b.setName(option.name).setDescription(option.description).setRequired(required));
			return;

		case "user":
			host.addUserOption((b) => b.setName(option.name).setDescription(option.description).setRequired(required));
			return;

		case "channel":
			host.addChannelOption((b) => b.setName(option.name).setDescription(option.description).setRequired(required));
			return;

		case "role":
			host.addRoleOption((b) => b.setName(option.name).setDescription(option.description).setRequired(required));
			return;

		case "attachment":
			host.addAttachmentOption((b) => b.setName(option.name).setDescription(option.description).setRequired(required));
			return;
	}
}

/**
 * `guildOnly: true` already stops a command reaching a DM, but TypeScript cannot
 * see that. These narrow the types without an `!`.
 */
export function inGuild(interaction: CommandInput): Guild {
	if (!interaction.guild) throw new UserFacingError("This command only works inside a server.");
	return interaction.guild;
}

export function asMember(interaction: CommandInput): GuildMember {
	const member = interaction.member;
	if (!member || !("guild" in member)) throw new UserFacingError("This command only works inside a server.");
	return member;
}

export function inTextChannel(interaction: CommandInput): GuildTextBasedChannel {
	const channel = interaction.channel;
	if (!channel || !("guild" in channel)) throw new UserFacingError("This command only works inside a server.");
	return channel;
}

/**
 * A `channel` option comes back as a partial API object. This looks the real one
 * up in the guild so you get a channel you can actually send to.
 */
export function textChannelOption(interaction: CommandInput, name: string): GuildTextBasedChannel | null {
	const picked = interaction.options.getChannel(name);
	if (!picked) return null;

	const channel = interaction.guild?.channels.cache.get(picked.id);
	if (!channel?.isTextBased()) throw new UserFacingError(`${picked.name} is not a channel I can send messages in.`);

	return channel;
}

/** Any kind of channel, resolved to the real object rather than the API stub. */
export function channelOption(interaction: CommandInput, name: string): GuildBasedChannel | null {
	const picked = interaction.options.getChannel(name);
	if (!picked) return null;

	const channel = interaction.guild?.channels.cache.get(picked.id);
	if (!channel) throw new UserFacingError("I could not find that channel in this server.");

	return channel;
}

/** The same idea for a `role` option. */
export function roleOption(interaction: CommandInput, name: string, required = false): Role | null {
	const picked = interaction.options.getRole(name, required);
	if (!picked) return null;

	const role = interaction.guild?.roles.cache.get(picked.id);
	if (!role) throw new UserFacingError("I could not find that role in this server.");

	return role;
}
