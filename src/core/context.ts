import {
	type ActionRowBuilder,
	type AttachmentBuilder,
	type DMChannel,
	type EmbedBuilder,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	type Message,
	type MessageActionRowComponentBuilder,
	type Role,
	type User,
} from "discord.js";
import { type TestifyClient } from "./client";

export type Surface = "slash" | "prefix";

export interface ReplyOptions {
	content?: string | undefined;
	embeds?: EmbedBuilder[] | undefined;
	components?: ActionRowBuilder<MessageActionRowComponentBuilder>[] | undefined;
	files?: AttachmentBuilder[] | undefined;
	/** Slash → `flags: MessageFlags.Ephemeral`. Prefix → ignored, since it is meaningless there. */
	ephemeral?: boolean | undefined;
	allowedMentions?:
		{ parse?: ("users" | "roles" | "everyone")[] | undefined; repliedUser?: boolean | undefined } | undefined;
}

/**
 * Uniform option access across both surfaces. The `required: true` overloads
 * return non-nullable types, matching the ergonomics discord.js gives on the
 * interaction side.
 */
export interface ResolvedOptions {
	getString(name: string, required: true): string;
	getString(name: string, required?: false): string | null;
	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: false): number | null;
	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: false): number | null;
	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: false): boolean | null;
	getUser(name: string, required: true): User;
	getUser(name: string, required?: false): User | null;
	getMember(name: string): GuildMember | null;
	getChannel(name: string): GuildBasedChannel | null;
	getRole(name: string): Role | null;
	getAttachmentUrl(name: string): string | null;
	getSubcommand(): string | null;
	getSubcommandGroup(): string | null;
	/** Everything after the parsed options, for commands that take free text. */
	rest(): string;
}

/**
 * The surface abstraction. Command logic never branches on whether it was invoked
 * by an interaction or a message, which is what lets one implementation serve
 * both surfaces and makes commands testable without faking a full Interaction.
 */
export interface CommandContext {
	readonly client: TestifyClient;
	readonly surface: Surface;
	readonly commandName: string;
	readonly guild: Guild | null;
	readonly channel: GuildTextBasedChannel | DMChannel | null;
	readonly user: User;
	readonly member: GuildMember | null;
	readonly options: ResolvedOptions;
	/** The originating message, when the command came in on the prefix surface. */
	readonly message: Message | null;
	readonly locale: string;

	readonly deferred: boolean;
	readonly replied: boolean;

	reply(options: ReplyOptions | string): Promise<void>;
	defer(ephemeral?: boolean): Promise<void>;
	editReply(options: ReplyOptions | string): Promise<void>;
	followUp(options: ReplyOptions | string): Promise<void>;
	deleteReply(): Promise<void>;
	/** The message the reply produced, when the surface can provide one. */
	fetchReply(): Promise<Message | null>;
}

export function normaliseReply(options: ReplyOptions | string): ReplyOptions {
	return typeof options === "string" ? { content: options } : options;
}
