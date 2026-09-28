import {
	type APIInteractionGuildMember,
	type ChatInputCommandInteraction,
	type AutocompleteInteraction,
	type Client,
	type EmbedBuilder,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	InteractionContextType,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	MessageFlags,
	MessageFlagsBitField,
	type MessageFlagsResolvable,
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

/** What a command is allowed to ask of whoever invoked it. */
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

	/** Null until a reply is deferred, and still null after a button's deferred update. */
	readonly ephemeral?: boolean | null;
	deleteReply?(): Promise<unknown>;
	/** A message cannot be private, so a prefix command's version of one deletes itself instead. */
	replyBriefly?(embed: EmbedBuilder): Promise<unknown>;
	/** Called on a prefix command marked private, whose replies then delete themselves. */
	tidyAway?(): void;
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
	getAttachment(name: string, required: true): CommandAttachment;
	getAttachment(name: string, required?: boolean): CommandAttachment | null;
}

/** The fields of discord.js's `Attachment` both surfaces can supply. */
export interface CommandAttachment {
	url: string;
	name: string;
	size: number;
	contentType: string | null;
	width: number | null;
	height: number | null;
}

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
	/** Named in the operator's logs, but its value never is. */
	unlogged?: boolean;
}

export interface Subcommand {
	name: string;
	description: string;
	options?: CommandOption[];
	/** Extra permissions this one subcommand needs, for a command whose other subcommands anybody may run. */
	permissions?: PermissionResolvable[];
	/** Prefix-only short forms, so `t?meme` still works after `/lookup meme`. */
	aliases?: string[];
	/** Only the person who ran it sees the answer. */
	private?: boolean;
	run(interaction: CommandInput, client: TestifyClient): Promise<void>;
}

export interface Command {
	name: string;
	description: string;
	category: Category;

	options?: CommandOption[];
	subcommands?: Subcommand[];

	/** Extra names this command answers to as a prefix command, e.g. */
	aliases?: string[];

	/** Permissions the person running it needs. */
	permissions?: PermissionResolvable[];
	/** Permissions the bot needs. */
	botPermissions?: PermissionResolvable[];
	/** Milliseconds a user must wait between uses. */
	cooldown?: number;
	/** Only usable inside a server. */
	guildOnly?: boolean;
	/** Only usable by the IDs in DISCORD_OWNER_IDS. */
	ownerOnly?: boolean;
	/** Only usable in age-restricted channels. */
	nsfw?: boolean;
	/** Only the person who ran it sees the answer, whichever subcommand it was. */
	private?: boolean;

	/** Optional when the command is nothing but subcommands. */
	run?(interaction: CommandInput, client: TestifyClient): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void>;
}

/** Proof that a real slash interaction satisfies the contract. */
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

/** Exposes a standalone command as a subcommand of another. */
export function asSubcommand(command: Command, aliases: string[] = []): Subcommand {
	if (command.subcommands?.length) {
		throw new Error(`${command.name} already has subcommands, and Discord only allows one level of nesting.`);
	}
	if (!command.run) throw new Error(`${command.name} has no run function to fold in.`);

	return {
		name: command.name,
		description: command.description,
		...(command.options ? { options: command.options } : {}),
		// The command keeps its own name as a prefix alias, so `t?meme` still works.
		aliases: [command.name, ...(command.aliases ?? []), ...aliases],
		...(command.private === true ? { private: true } : {}),
		run: async (interaction, client) => command.run?.(interaction, client),
	};
}

function withEphemeral<T extends { flags?: unknown }>(options: T | undefined): T {
	const flags = new MessageFlagsBitField((options?.flags ?? 0) as MessageFlagsResolvable);
	return { ...options, flags: flags.add(MessageFlags.Ephemeral).bitfield } as T;
}

/** Every reply the command sends reaches only its runner. */
export function privately(interaction: CommandInput): CommandInput {
	if (interaction.tidyAway !== undefined) {
		interaction.tidyAway();
		return interaction;
	}

	return new Proxy(interaction, {
		get(target, property) {
			if (property === "reply") return (options: InteractionReplyOptions) => target.reply(withEphemeral(options));
			if (property === "followUp") return (options: InteractionReplyOptions) => target.followUp(withEphemeral(options));
			if (property === "deferReply") {
				return (options?: { flags?: unknown }) => target.deferReply(withEphemeral(options));
			}

			const value: unknown = Reflect.get(target, property, target);
			return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
		},
	});
}

/** An option a run was given, in plain words; `value` is null for one marked `unlogged`. */
export interface GivenOption {
	name: string;
	value: string | null;
}

function readOption(options: CommandInputOptions, option: CommandOption): string | null {
	const { name } = option;

	switch (option.type) {
		case "string":
			return options.getString(name);
		case "integer": {
			const value = options.getInteger(name);
			return value === null ? null : String(value);
		}
		case "number": {
			const value = options.getNumber(name);
			return value === null ? null : String(value);
		}
		case "boolean": {
			const value = options.getBoolean(name);
			return value === null ? null : value ? "Yes" : "No";
		}
		case "user": {
			const user = options.getUser(name);
			return user === null ? null : `@${user.username} (${user.id})`;
		}
		case "channel": {
			const channel = options.getChannel(name);
			return channel === null ? null : `#${channel.name ?? "unknown"} (${channel.id})`;
		}
		case "role": {
			const role = options.getRole(name);
			return role === null ? null : `@${role.name} (${role.id})`;
		}
		case "attachment": {
			const file = options.getAttachment(name);
			return file === null ? null : `${file.name} (${file.url})`;
		}
	}
}

/** The subcommand a run chose, or null for a command without them or a prefix run that named none. */
export function chosenSubcommand(input: CommandInput, command: Command): string | null {
	if (subcommandsOf(command).length === 0) return null;
	try {
		return input.options.getSubcommand(false) || null;
	} catch {
		return null;
	}
}

/** The options a run was given, for the operator's logs; one that cannot be read is left out. */
export function givenOptions(input: CommandInput, command: Command): GivenOption[] {
	const subcommands = subcommandsOf(command);
	const chosen = chosenSubcommand(input, command);
	const declared =
		subcommands.length > 0
			? (subcommands.find((candidate) => candidate.name === chosen)?.options ?? [])
			: (command.options ?? []);

	const given: GivenOption[] = [];
	for (const option of declared) {
		let value: string | null;
		try {
			value = readOption(input.options, option);
		} catch {
			continue;
		}
		if (value !== null) given.push({ name: option.name, value: option.unlogged === true ? null : value });
	}
	return given;
}

/** Sends the interaction to the right handler. */
export async function dispatch(interaction: CommandInput, command: Command, client: TestifyClient): Promise<void> {
	const subcommands = subcommandsOf(command);
	const chosen = subcommands.length > 0 ? interaction.options.getSubcommand(false) : null;
	const subcommand = subcommands.find((candidate) => candidate.name === chosen);
	const input = command.private === true || subcommand?.private === true ? privately(interaction) : interaction;

	if (subcommand) {
		await subcommand.run(input, client);
		return;
	}

	if (!command.run) {
		throw new UserFacingError(`Pick a subcommand: ${subcommands.map((sub) => `\`${sub.name}\``).join(", ")}.`);
	}

	await command.run(input, client);
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

/** `guildOnly: true` already stops a command reaching a DM, but TypeScript cannot see that. */
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

/** A `channel` option comes back as a partial API object. */
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
