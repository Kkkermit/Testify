import {
	type DMChannel,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	type Message,
	type Role,
	type User,
} from "discord.js";
import { type OptionDefinition, type SharedCommand } from "../core/command";
import { type TestifyClient } from "../core/client";
import { type CommandContext, normaliseReply, type ReplyOptions, type ResolvedOptions } from "../core/context";

interface ParsedValues {
	strings: Map<string, string>;
	numbers: Map<string, number>;
	booleans: Map<string, boolean>;
	users: Map<string, User>;
	members: Map<string, GuildMember>;
	channels: Map<string, GuildBasedChannel>;
	roles: Map<string, Role>;
	subcommand: string | null;
	subcommandGroup: string | null;
	rest: string;
}

const TRUTHY = new Set(["true", "yes", "y", "on", "enable", "enabled", "1"]);
const FALSY = new Set(["false", "no", "n", "off", "disable", "disabled", "0"]);

function extractId(token: string, pattern: RegExp): string | null {
	const match = pattern.exec(token);
	if (match?.[1] !== undefined) return match[1];
	return /^\d{17,20}$/.test(token) ? token : null;
}

async function resolveUser(client: TestifyClient, token: string, guild: Guild | null): Promise<User | null> {
	const id = extractId(token, /^<@!?(\d{17,20})>$/);
	if (id !== null) {
		return client.users.fetch(id).catch(() => null);
	}
	if (!guild) return null;

	const needle = token.toLowerCase();
	const cached = guild.members.cache.find(
		(member) => member.user.username.toLowerCase() === needle || member.displayName.toLowerCase() === needle,
	);
	return cached?.user ?? null;
}

function resolveChannel(token: string, guild: Guild | null): GuildBasedChannel | null {
	if (!guild) return null;
	const id = extractId(token, /^<#(\d{17,20})>$/);
	if (id !== null) return guild.channels.cache.get(id) ?? null;
	const needle = token.toLowerCase().replace(/^#/, "");
	return guild.channels.cache.find((channel) => channel.name.toLowerCase() === needle) ?? null;
}

function resolveRole(token: string, guild: Guild | null): Role | null {
	if (!guild) return null;
	const id = extractId(token, /^<@&(\d{17,20})>$/);
	if (id !== null) return guild.roles.cache.get(id) ?? null;
	const needle = token.toLowerCase().replace(/^@/, "");
	return guild.roles.cache.find((role) => role.name.toLowerCase() === needle) ?? null;
}

/**
 * Maps positional prefix arguments onto the command's declared options, in
 * declaration order. A `greedy` string option consumes everything that is left,
 * which is how free-text commands (reasons, queries, messages) work.
 */
async function parse(
	client: TestifyClient,
	message: Message,
	definitions: OptionDefinition[],
	tokens: string[],
): Promise<Omit<ParsedValues, "subcommand" | "subcommandGroup">> {
	const values: Omit<ParsedValues, "subcommand" | "subcommandGroup"> = {
		strings: new Map(),
		numbers: new Map(),
		booleans: new Map(),
		users: new Map(),
		members: new Map(),
		channels: new Map(),
		roles: new Map(),
		rest: "",
	};

	const guild = message.guild;
	let cursor = 0;

	for (const definition of definitions) {
		if (cursor >= tokens.length) break;

		if (definition.type === "string" && definition.greedy === true) {
			values.strings.set(definition.name, tokens.slice(cursor).join(" "));
			cursor = tokens.length;
			continue;
		}

		const token = tokens[cursor];
		if (token === undefined) break;

		switch (definition.type) {
			case "string":
				values.strings.set(definition.name, token);
				cursor += 1;
				break;
			case "integer":
			case "number": {
				const parsed = definition.type === "integer" ? Number.parseInt(token, 10) : Number.parseFloat(token);
				if (Number.isNaN(parsed)) break;
				values.numbers.set(definition.name, parsed);
				cursor += 1;
				break;
			}
			case "boolean": {
				const lowered = token.toLowerCase();
				if (TRUTHY.has(lowered)) values.booleans.set(definition.name, true);
				else if (FALSY.has(lowered)) values.booleans.set(definition.name, false);
				else break;
				cursor += 1;
				break;
			}
			case "user":
			case "mentionable": {
				const user = await resolveUser(client, token, guild);
				if (!user) break;
				values.users.set(definition.name, user);
				const member = guild ? await guild.members.fetch(user.id).catch(() => null) : null;
				if (member) values.members.set(definition.name, member);
				cursor += 1;
				break;
			}
			case "channel": {
				const channel = resolveChannel(token, guild);
				if (!channel) break;
				values.channels.set(definition.name, channel);
				cursor += 1;
				break;
			}
			case "role": {
				const role = resolveRole(token, guild);
				if (!role) break;
				values.roles.set(definition.name, role);
				cursor += 1;
				break;
			}
			case "attachment": {
				const attachment = message.attachments.first();
				if (attachment) values.strings.set(definition.name, attachment.url);
				break;
			}
		}
	}

	values.rest = tokens.slice(cursor).join(" ");
	return values;
}

class PrefixOptions implements ResolvedOptions {
	constructor(private readonly values: ParsedValues) {}

	getString(name: string, required: true): string;
	getString(name: string, required?: false): string | null;
	getString(name: string, required?: boolean): string | null {
		const value = this.values.strings.get(name) ?? null;
		if (value === null && required === true) throw new Error(`Missing required argument: ${name}`);
		return value;
	}

	getInteger(name: string, required: true): number;
	getInteger(name: string, required?: false): number | null;
	getInteger(name: string, required?: boolean): number | null {
		const value = this.values.numbers.get(name);
		if (value === undefined) {
			if (required === true) throw new Error(`Missing required argument: ${name}`);
			return null;
		}
		return Math.trunc(value);
	}

	getNumber(name: string, required: true): number;
	getNumber(name: string, required?: false): number | null;
	getNumber(name: string, required?: boolean): number | null {
		const value = this.values.numbers.get(name);
		if (value === undefined) {
			if (required === true) throw new Error(`Missing required argument: ${name}`);
			return null;
		}
		return value;
	}

	getBoolean(name: string, required: true): boolean;
	getBoolean(name: string, required?: false): boolean | null;
	getBoolean(name: string, required?: boolean): boolean | null {
		const value = this.values.booleans.get(name);
		if (value === undefined) {
			if (required === true) throw new Error(`Missing required argument: ${name}`);
			return null;
		}
		return value;
	}

	getUser(name: string, required: true): User;
	getUser(name: string, required?: false): User | null;
	getUser(name: string, required?: boolean): User | null {
		const value = this.values.users.get(name) ?? null;
		if (value === null && required === true) throw new Error(`Missing required argument: ${name}`);
		return value;
	}

	getMember(name: string): GuildMember | null {
		return this.values.members.get(name) ?? null;
	}

	getChannel(name: string): GuildBasedChannel | null {
		return this.values.channels.get(name) ?? null;
	}

	getRole(name: string): Role | null {
		return this.values.roles.get(name) ?? null;
	}

	getAttachmentUrl(name: string): string | null {
		return this.values.strings.get(name) ?? null;
	}

	getSubcommand(): string | null {
		return this.values.subcommand;
	}

	getSubcommandGroup(): string | null {
		return this.values.subcommandGroup;
	}

	rest(): string {
		return this.values.rest;
	}
}

/** Adapts a message-based invocation to the shared context. */
export class PrefixContext implements CommandContext {
	readonly surface = "prefix" as const;
	readonly options: ResolvedOptions;
	private sent: Message | null = null;
	private acknowledged = false;

	constructor(
		readonly client: TestifyClient,
		readonly message: Message,
		readonly commandName: string,
		values: ParsedValues,
	) {
		this.options = new PrefixOptions(values);
	}

	get guild(): Guild | null {
		return this.message.guild;
	}

	get channel(): GuildTextBasedChannel | DMChannel | null {
		return this.message.channel as GuildTextBasedChannel | DMChannel;
	}

	get user(): User {
		return this.message.author;
	}

	get member(): GuildMember | null {
		return this.message.member;
	}

	get locale(): string {
		return this.message.guild?.preferredLocale ?? "en-US";
	}

	/** Prefix has no deferral concept; the flag exists so shared code can branch uniformly. */
	readonly deferred = false;

	get replied(): boolean {
		return this.acknowledged;
	}

	async reply(options: ReplyOptions | string): Promise<void> {
		this.sent = await this.message.reply(toMessagePayload(normaliseReply(options)));
		this.acknowledged = true;
	}

	async defer(): Promise<void> {
		const channel = this.message.channel;
		if ("sendTyping" in channel) await channel.sendTyping();
	}

	async editReply(options: ReplyOptions | string): Promise<void> {
		if (!this.sent) {
			await this.reply(options);
			return;
		}
		await this.sent.edit(toMessagePayload(normaliseReply(options)));
	}

	async followUp(options: ReplyOptions | string): Promise<void> {
		if (!this.message.channel.isSendable()) return;
		this.sent = await this.message.channel.send(toMessagePayload(normaliseReply(options)));
	}

	async deleteReply(): Promise<void> {
		await this.sent?.delete();
		this.sent = null;
	}

	fetchReply(): Promise<Message | null> {
		return Promise.resolve(this.sent);
	}
}

/** Splits raw arguments across the command's subcommand tree, then binds the options. */
export async function createPrefixContext(
	client: TestifyClient,
	message: Message,
	command: SharedCommand,
	args: string[],
): Promise<PrefixContext> {
	let tokens = [...args];
	let subcommandGroup: string | null = null;
	let subcommand: string | null = null;
	let definitions = command.options ?? [];

	const group = command.subcommandGroups?.find((candidate) => candidate.name === tokens[0]?.toLowerCase());
	if (group) {
		subcommandGroup = group.name;
		tokens = tokens.slice(1);
		const nested = group.subcommands.find((candidate) => candidate.name === tokens[0]?.toLowerCase());
		if (nested) {
			subcommand = nested.name;
			definitions = nested.options ?? [];
			tokens = tokens.slice(1);
		}
	} else {
		const direct = command.subcommands?.find((candidate) => candidate.name === tokens[0]?.toLowerCase());
		if (direct) {
			subcommand = direct.name;
			definitions = direct.options ?? [];
			tokens = tokens.slice(1);
		} else if (command.subcommands && command.subcommands.length > 0) {
			// Falling back to the first subcommand keeps `t?leaderboard` working the way
			// the old prefix-only commands did, where the slash version has subcommands.
			const fallback = command.subcommands[0]!;
			subcommand = fallback.name;
			definitions = fallback.options ?? [];
		}
	}

	const values = await parse(client, message, definitions, tokens);
	return new PrefixContext(client, message, command.name, { ...values, subcommand, subcommandGroup });
}

/** `ephemeral` is meaningless on a message reply, so it is dropped rather than passed through. */
function toMessagePayload(options: ReplyOptions): Record<string, unknown> {
	const { ephemeral: _ephemeral, ...rest } = options;
	return { ...rest, allowedMentions: rest.allowedMentions ?? { repliedUser: false } };
}
