import {
	type ChatInputCommandInteraction,
	type DMChannel,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	InteractionContextType,
	type Message,
	MessageFlags,
	PermissionsBitField,
	type Role,
	type SlashCommandAttachmentOption,
	type SlashCommandBooleanOption,
	SlashCommandBuilder,
	type SlashCommandChannelOption,
	type SlashCommandIntegerOption,
	type SlashCommandMentionableOption,
	type SlashCommandNumberOption,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandRoleOption,
	type SlashCommandStringOption,
	type SlashCommandSubcommandBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
	type SlashCommandUserOption,
	type User,
} from "discord.js";
import { type OptionDefinition, type SharedCommand, type SharedSubcommand } from "../core/command";
import { type TestifyClient } from "../core/client";
import { type CommandContext, normaliseReply, type ReplyOptions, type ResolvedOptions } from "../core/context";

type AnySlashBuilder = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

/** Translates a surface-agnostic command definition into Discord's application command payload. */
export function toSlashCommand(command: SharedCommand): AnySlashBuilder {
	const builder = new SlashCommandBuilder().setName(command.name).setDescription(command.description);

	if (command.guildOnly === true) {
		builder.setContexts(InteractionContextType.Guild);
	} else {
		builder.setContexts(
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		);
	}

	if (command.nsfw === true) builder.setNSFW(true);

	if (command.permissions && command.permissions.length > 0) {
		builder.setDefaultMemberPermissions(new PermissionsBitField(command.permissions).bitfield);
	}

	for (const option of command.options ?? []) applyOption(builder, option);

	for (const sub of command.subcommands ?? []) {
		builder.addSubcommand((subBuilder) => buildSubcommand(subBuilder, sub));
	}

	for (const group of command.subcommandGroups ?? []) {
		builder.addSubcommandGroup((groupBuilder) => {
			groupBuilder.setName(group.name).setDescription(group.description);
			for (const sub of group.subcommands) {
				groupBuilder.addSubcommand((subBuilder) => buildSubcommand(subBuilder, sub));
			}
			return groupBuilder;
		});
	}

	return builder;
}

function buildSubcommand(builder: SlashCommandSubcommandBuilder, sub: SharedSubcommand): SlashCommandSubcommandBuilder {
	builder.setName(sub.name).setDescription(sub.description);
	for (const option of sub.options ?? []) applyOption(builder, option);
	return builder;
}

/**
 * Structural view of the two builder shapes that accept options. Discord.js
 * narrows its fluent builders differently on `SlashCommandBuilder` and
 * `SlashCommandSubcommandBuilder`, so the shared code targets what they have in
 * common rather than either concrete type.
 */
interface OptionHost {
	addStringOption(fn: (builder: SlashCommandStringOption) => SlashCommandStringOption): unknown;
	addIntegerOption(fn: (builder: SlashCommandIntegerOption) => SlashCommandIntegerOption): unknown;
	addNumberOption(fn: (builder: SlashCommandNumberOption) => SlashCommandNumberOption): unknown;
	addBooleanOption(fn: (builder: SlashCommandBooleanOption) => SlashCommandBooleanOption): unknown;
	addUserOption(fn: (builder: SlashCommandUserOption) => SlashCommandUserOption): unknown;
	addChannelOption(fn: (builder: SlashCommandChannelOption) => SlashCommandChannelOption): unknown;
	addRoleOption(fn: (builder: SlashCommandRoleOption) => SlashCommandRoleOption): unknown;
	addMentionableOption(fn: (builder: SlashCommandMentionableOption) => SlashCommandMentionableOption): unknown;
	addAttachmentOption(fn: (builder: SlashCommandAttachmentOption) => SlashCommandAttachmentOption): unknown;
}

function applyOption(host: OptionHost, option: OptionDefinition): void {
	const required = option.required ?? false;

	switch (option.type) {
		case "string":
			host.addStringOption((builder: SlashCommandStringOption) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.minLength !== undefined) builder.setMinLength(option.minLength);
				if (option.maxLength !== undefined) builder.setMaxLength(option.maxLength);
				if (option.autocomplete === true) builder.setAutocomplete(true);
				else if (option.choices) {
					builder.addChoices(...option.choices.map((c) => ({ name: c.name, value: String(c.value) })));
				}
				return builder;
			});
			return;
		case "integer":
			host.addIntegerOption((builder: SlashCommandIntegerOption) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.minValue !== undefined) builder.setMinValue(option.minValue);
				if (option.maxValue !== undefined) builder.setMaxValue(option.maxValue);
				if (option.autocomplete === true) builder.setAutocomplete(true);
				else if (option.choices) {
					builder.addChoices(...option.choices.map((c) => ({ name: c.name, value: Number(c.value) })));
				}
				return builder;
			});
			return;
		case "number":
			host.addNumberOption((builder: SlashCommandNumberOption) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				if (option.minValue !== undefined) builder.setMinValue(option.minValue);
				if (option.maxValue !== undefined) builder.setMaxValue(option.maxValue);
				return builder;
			});
			return;
		case "boolean":
			host.addBooleanOption((builder: SlashCommandBooleanOption) =>
				builder.setName(option.name).setDescription(option.description).setRequired(required),
			);
			return;
		case "user":
			host.addUserOption((builder) =>
				builder.setName(option.name).setDescription(option.description).setRequired(required),
			);
			return;
		case "channel":
			host.addChannelOption((builder: SlashCommandChannelOption) => {
				builder.setName(option.name).setDescription(option.description).setRequired(required);
				return builder;
			});
			return;
		case "role":
			host.addRoleOption((builder) =>
				builder.setName(option.name).setDescription(option.description).setRequired(required),
			);
			return;
		case "mentionable":
			host.addMentionableOption((builder) =>
				builder.setName(option.name).setDescription(option.description).setRequired(required),
			);
			return;
		case "attachment":
			host.addAttachmentOption((builder) =>
				builder.setName(option.name).setDescription(option.description).setRequired(required),
			);
			return;
	}
}

class SlashOptions implements ResolvedOptions {
	constructor(private readonly interaction: ChatInputCommandInteraction) {}

	getString(name: string, required: true): string;
	getString(name: string, required?: false): string | null;
	getString(name: string, required?: boolean): string | null {
		return this.interaction.options.getString(name, required as true);
	}

	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: false): number | null;
	getInteger(name: string, required?: boolean): number | null {
		return this.interaction.options.getInteger(name, required as true);
	}

	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: false): number | null;
	getNumber(name: string, required?: boolean): number | null {
		return this.interaction.options.getNumber(name, required as true);
	}

	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: false): boolean | null;
	getBoolean(name: string, required?: boolean): boolean | null {
		return this.interaction.options.getBoolean(name, required as true);
	}

	getUser(name: string, required: true): User;
	getUser(name: string, required?: false): User | null;
	getUser(name: string, required?: boolean): User | null {
		return this.interaction.options.getUser(name, required as true);
	}

	getMember(name: string): GuildMember | null {
		const member = this.interaction.options.getMember(name);
		return member && "guild" in member ? member : null;
	}

	getChannel(name: string): GuildBasedChannel | null {
		return (this.interaction.options.getChannel(name) as GuildBasedChannel | null) ?? null;
	}

	getRole(name: string): Role | null {
		return (this.interaction.options.getRole(name) as Role | null) ?? null;
	}

	getAttachmentUrl(name: string): string | null {
		return this.interaction.options.getAttachment(name)?.url ?? null;
	}

	getSubcommand(): string | null {
		return this.interaction.options.getSubcommand(false);
	}

	getSubcommandGroup(): string | null {
		return this.interaction.options.getSubcommandGroup(false);
	}

	rest(): string {
		return "";
	}
}

/** Adapts a chat-input interaction to the shared context. */
export class SlashContext implements CommandContext {
	readonly surface = "slash" as const;
	readonly options: ResolvedOptions;
	readonly message = null;

	constructor(
		readonly client: TestifyClient,
		private readonly interaction: ChatInputCommandInteraction,
	) {
		this.options = new SlashOptions(interaction);
	}

	get commandName(): string {
		return this.interaction.commandName;
	}

	get guild(): CommandContext["guild"] {
		return this.interaction.guild;
	}

	get channel(): GuildTextBasedChannel | DMChannel | null {
		return (this.interaction.channel as GuildTextBasedChannel | DMChannel | null) ?? null;
	}

	get user(): User {
		return this.interaction.user;
	}

	get member(): GuildMember | null {
		const member = this.interaction.member;
		return member && "guild" in member ? member : null;
	}

	get locale(): string {
		return this.interaction.locale;
	}

	get deferred(): boolean {
		return this.interaction.deferred;
	}

	get replied(): boolean {
		return this.interaction.replied;
	}

	async reply(options: ReplyOptions | string): Promise<void> {
		const payload = toInteractionPayload(normaliseReply(options));
		if (this.interaction.deferred || this.interaction.replied) {
			await this.interaction.editReply(payload);
			return;
		}
		await this.interaction.reply(payload);
	}

	async defer(ephemeral = false): Promise<void> {
		if (this.interaction.deferred || this.interaction.replied) return;
		await this.interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});
	}

	async editReply(options: ReplyOptions | string): Promise<void> {
		await this.interaction.editReply(toInteractionPayload(normaliseReply(options)));
	}

	async followUp(options: ReplyOptions | string): Promise<void> {
		await this.interaction.followUp(toInteractionPayload(normaliseReply(options)));
	}

	async deleteReply(): Promise<void> {
		await this.interaction.deleteReply();
	}

	async fetchReply(): Promise<Message | null> {
		return this.interaction.fetchReply();
	}
}

/**
 * The single place `ephemeral` is translated. Feature code says what it means and
 * the adapter decides how the surface expresses it.
 */
function toInteractionPayload(options: ReplyOptions): Record<string, unknown> {
	const { ephemeral, ...rest } = options;
	return ephemeral === true ? { ...rest, flags: MessageFlags.Ephemeral } : rest;
}
