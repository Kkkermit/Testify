import {
	type Attachment,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	type Message,
	type Role,
	type TextBasedChannel,
	type User,
} from "discord.js";
import {
	type Command,
	type CommandInput,
	type CommandInputOptions,
	type CommandOption,
	subcommandsOf,
} from "./command";
import { UserFacingError } from "./errors";

/**
 * Lets `t?ban @someone spamming` run the exact same code as `/ban`.
 *
 * Commands are written once, against a slash interaction. This file is the only
 * place that knows prefix commands exist: it turns a message into something that
 * answers the handful of questions a command asks — who ran it, where, what were
 * the options — and sends replies back to the channel.
 */

const MENTION = /^<@!?(\d+)>$/;
const CHANNEL_MENTION = /^<#(\d+)>$/;
const ROLE_MENTION = /^<@&(\d+)>$/;
const SNOWFLAKE = /^\d{17,20}$/;

/** Splits on spaces, but keeps "quoted phrases" in one piece. */
export function splitArgs(input: string): string[] {
	const args: string[] = [];
	const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;

	for (const match of input.matchAll(pattern)) {
		args.push(match[1] ?? match[2] ?? match[3] ?? "");
	}

	return args;
}

export interface ParsedMessage {
	name: string;
	args: string[];
}

/**
 * Finds the command name in a message. Returns null when the message is not
 * addressed to us, which is the overwhelmingly common case — so this stays cheap.
 */
export function parseMessage(content: string, prefix: string, botId: string): ParsedMessage | null {
	const mention = new RegExp(`^<@!?${botId}>\\s+`);
	const used = mention.exec(content)?.[0] ?? (content.startsWith(prefix) ? prefix : null);
	if (used === null) return null;

	const [name, ...args] = splitArgs(content.slice(used.length).trim());
	if (name === undefined || name === "") return null;

	return { name: name.toLowerCase(), args };
}

/**
 * Answers the option questions a command asks. Options are matched by position,
 * in the order the command declares them, and the last string option swallows
 * whatever is left — so `t?ban @someone being a nuisance` reads the way you
 * would expect rather than stopping at the first space.
 */
class PrefixOptions implements CommandInputOptions {
	private readonly message: Message;
	private readonly command: Command;
	private readonly args: string[];
	private parsed: { values: Map<string, string>; subcommand: string | null } | null = null;

	constructor(message: Message, command: Command, args: string[]) {
		this.message = message;
		this.command = command;
		this.args = args;
	}

	/**
	 * Parsing is deferred to the first question asked, so a message that names no
	 * subcommand fails inside the command's error boundary and the user gets a
	 * proper answer, rather than throwing while the object is being built.
	 */
	private get state(): { values: Map<string, string>; subcommand: string | null } {
		if (this.parsed !== null) return this.parsed;

		const subcommands = subcommandsOf(this.command);
		const values = new Map<string, string>();
		let remaining = this.args;
		let declared: CommandOption[];
		let subcommand: string | null = null;

		if (subcommands.length > 0) {
			const wanted = remaining[0]?.toLowerCase() ?? "";
			const chosen = subcommands.find((candidate) => candidate.name === wanted);

			if (!chosen) {
				throw new UserFacingError(`Pick one of: ${subcommands.map((sub) => `\`${sub.name}\``).join(", ")}.`);
			}

			subcommand = chosen.name;
			declared = chosen.options ?? [];
			remaining = remaining.slice(1);
		} else {
			declared = this.command.options ?? [];
		}

		declared.forEach((option, index) => {
			const isLast = index === declared.length - 1;
			const value = isLast && option.type === "string" ? remaining.slice(index).join(" ") : remaining[index];

			if (value !== undefined && value !== "") values.set(option.name, value);
		});

		this.parsed = { values, subcommand };
		return this.parsed;
	}

	private raw(name: string): string | undefined {
		return this.state.values.get(name);
	}

	getSubcommand(required?: boolean): string {
		const { subcommand } = this.state;
		if (subcommand === null && required !== false) throw new UserFacingError("That command needs a subcommand.");
		return subcommand ?? "";
	}

	getString(name: string, required: true): string;
	getString(name: string, required?: boolean): string | null;
	getString(name: string, required?: boolean): string | null {
		return this.require(name, this.raw(name) ?? null, required);
	}

	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: boolean): number | null;
	getInteger(name: string, required?: boolean): number | null {
		return this.require(name, this.number(name, Number.isInteger), required);
	}

	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: boolean): number | null;
	getNumber(name: string, required?: boolean): number | null {
		return this.require(name, this.number(name, Number.isFinite), required);
	}

	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: boolean): boolean | null;
	getBoolean(name: string, required?: boolean): boolean | null {
		const raw = this.raw(name)?.toLowerCase();
		if (raw === undefined) return this.require(name, null, required);
		return this.require(name, ["true", "yes", "y", "on", "1"].includes(raw), required);
	}

	getUser(name: string, required: true): User;
	getUser(name: string, required?: boolean): User | null;
	getUser(name: string, required?: boolean): User | null {
		const raw = this.raw(name);
		if (raw === undefined) return this.require(name, null, required);

		const mentioned = this.message.mentions.users.find((user) => raw.includes(user.id));
		if (mentioned) return this.require(name, mentioned, required);

		const id = MENTION.exec(raw)?.[1] ?? (SNOWFLAKE.test(raw) ? raw : null);
		if (id !== null) {
			const cached = this.message.client.users.cache.get(id);
			if (cached) return this.require(name, cached, required);
		}

		const byName = this.message.guild?.members.cache.find(
			(member) => member.user.username.toLowerCase() === raw.toLowerCase(),
		);

		return this.require(name, byName?.user ?? null, required);
	}

	getMember(name: string): GuildMember | null {
		const user = this.getUser(name);
		return user === null ? null : (this.message.guild?.members.cache.get(user.id) ?? null);
	}

	getChannel(name: string, required: true): GuildBasedChannel;
	getChannel(name: string, required?: boolean): GuildBasedChannel | null;
	getChannel(name: string, required?: boolean): GuildBasedChannel | null {
		const raw = this.raw(name);
		if (raw === undefined) return this.require(name, null, required);

		const id = CHANNEL_MENTION.exec(raw)?.[1] ?? (SNOWFLAKE.test(raw) ? raw : null);
		const found =
			id !== null
				? this.message.guild?.channels.cache.get(id)
				: this.message.guild?.channels.cache.find((channel) => channel.name === raw.replace(/^#/, ""));

		return this.require(name, found ?? null, required);
	}

	getRole(name: string, required: true): Role;
	getRole(name: string, required?: boolean): Role | null;
	getRole(name: string, required?: boolean): Role | null {
		const raw = this.raw(name);
		if (raw === undefined) return this.require(name, null, required);

		const id = ROLE_MENTION.exec(raw)?.[1] ?? (SNOWFLAKE.test(raw) ? raw : null);
		const found =
			id !== null
				? this.message.guild?.roles.cache.get(id)
				: this.message.guild?.roles.cache.find((role) => role.name.toLowerCase() === raw.toLowerCase());

		return this.require(name, found ?? null, required);
	}

	/** Attachments come off the message itself; there is nowhere else for them to be. */
	getAttachment(name: string, required: true): Attachment;
	getAttachment(name: string, required?: boolean): Attachment | null;
	getAttachment(name: string, required?: boolean): Attachment | null {
		return this.require(name, this.message.attachments.first() ?? null, required);
	}

	/** Prefix commands have no autocomplete, so this is only here to complete the shape. */
	getFocused(): string {
		return "";
	}

	private number(name: string, valid: (value: number) => boolean): number | null {
		const raw = this.raw(name);
		if (raw === undefined) return null;

		const parsed = Number(raw);
		if (!valid(parsed)) throw new UserFacingError(`\`${name}\` has to be a number.`);

		return parsed;
	}

	private require<T>(name: string, value: T | null, required: boolean | undefined): T {
		if (value === null && required === true) throw new UserFacingError(`You need to give me \`${name}\`.`);
		return value as T;
	}
}

/**
 * A message pretending to be a slash interaction, closely enough that a command
 * cannot tell. Replies go to the channel; the first one is a real reply to the
 * user's message and the rest edit it, mirroring how a slash reply behaves.
 */
export class PrefixInteraction implements CommandInput {
	readonly options: PrefixOptions;
	readonly user: User;
	readonly member: GuildMember | null;
	readonly guild: Guild | null;
	readonly guildId: string | null;
	readonly channel: TextBasedChannel | null;
	readonly client: Message["client"];
	readonly commandName: string;

	deferred = false;
	replied = false;

	private sent: Message | null = null;

	constructor(
		private readonly message: Message,
		command: Command,
		args: string[],
	) {
		this.options = new PrefixOptions(message, command, args);
		this.user = message.author;
		this.member = message.member;
		this.guild = message.guild;
		this.guildId = message.guildId;
		this.channel = message.channel;
		this.client = message.client;
		this.commandName = command.name;
	}

	/** There is no "thinking" state on a message, so we show typing instead. */
	async deferReply(): Promise<void> {
		this.deferred = true;
		if (this.channel !== null && "sendTyping" in this.channel) await this.channel.sendTyping();
	}

	async reply(options: InteractionReplyOptions | string): Promise<Message> {
		return this.send(options);
	}

	async editReply(options: InteractionEditReplyOptions | string): Promise<Message> {
		return this.send(options);
	}

	/** A follow-up is a second message, so it never edits the first. */
	async followUp(options: InteractionReplyOptions | string): Promise<Message> {
		return this.message.reply(withoutInteractionFlags(options));
	}

	fetchReply(): Promise<Message> {
		if (this.sent === null) throw new UserFacingError("Nothing has been sent yet.");
		return Promise.resolve(this.sent);
	}

	/**
	 * The first answer replies to the user's message; every one after it edits
	 * that reply, which is how a slash command behaves.
	 */
	private async send(options: InteractionReplyOptions | InteractionEditReplyOptions | string): Promise<Message> {
		const payload = withoutInteractionFlags(options);

		this.sent = this.sent === null ? await this.message.reply(payload) : await this.sent.edit(payload);
		this.replied = true;
		this.deferred = false;

		return this.sent;
	}

	/** Autocomplete never reaches a prefix command; this keeps the shape complete. */
	respond(): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * `flags: MessageFlags.Ephemeral` only means something to an interaction, and
 * Discord rejects it on a normal message — so a reply that would have been
 * private is simply sent in the channel instead.
 */
function withoutInteractionFlags(options: InteractionReplyOptions | InteractionEditReplyOptions | string): never {
	if (typeof options === "string") return { content: options } as never;

	const { flags: _flags, ...rest } = options as InteractionReplyOptions;
	return rest as never;
}
