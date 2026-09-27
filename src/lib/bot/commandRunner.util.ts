import {
	type APIEmbed,
	type Guild,
	type GuildBasedChannel,
	type GuildMember,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	MessageFlags,
	type Role,
	type TextBasedChannel,
	type User,
} from "discord.js";
import { type TestifyClient } from "@core/client";
import {
	type Command,
	type CommandAttachment,
	type CommandInput,
	type CommandInputOptions,
	type CommandOption,
	subcommandsOf,
} from "@core/command";
import { UserFacingError } from "@core/errors";
import { type CommandRunRequest, type RunOutput } from "@testify/shared";

/** Running a command from the dashboard, for owner commands on an opt-in allowlist only. */

/** Every command the runner may execute; a command whose real work is a panel belongs on its own screen. */
export const ALLOWED_IN_DASHBOARD: readonly string[] = [
	"bot",
	"guild-list",
	"member-count",
	"permissions",
	"ping",
	"role-info",
	"server-info",
	"user-info",
];

/** `/eval` turns a stolen session cookie into a shell, and no allowlist entry is worth that. */
export const NEVER_IN_DASHBOARD: readonly string[] = ["eval", "dm", "flush-logs"];

export function runnableInDashboard(name: string): boolean {
	return ALLOWED_IN_DASHBOARD.includes(name) && !NEVER_IN_DASHBOARD.includes(name);
}

/** The options a command declares for the subcommand being run, or its top-level ones. */
export function optionsFor(command: Command, subcommand: string | null): CommandOption[] {
	if (subcommand === null) return command.options ?? [];

	const found = subcommandsOf(command).find((candidate) => candidate.name === subcommand);
	if (found === undefined) throw new UserFacingError(`\`${command.name}\` has no \`${subcommand}\` subcommand.`);

	return found.options ?? [];
}

/** Arguments from a JSON body, coerced to the declared types; anything the command did not declare is dropped. */
export class DashboardOptions implements CommandInputOptions {
	private readonly values = new Map<string, string | number | boolean>();

	constructor(
		private readonly client: TestifyClient,
		private readonly guild: Guild | null,
		private readonly declared: CommandOption[],
		private readonly subcommand: string | null,
		args: CommandRunRequest["args"],
	) {
		for (const option of declared) {
			// `hasOwn`, so an option named `toString` does not find `Object.prototype`'s method.
			if (!Object.hasOwn(args, option.name)) continue;

			const given = args[option.name];
			if (given !== undefined) this.values.set(option.name, given);
		}
	}

	getSubcommand(required = true): string {
		if (this.subcommand === null && required) throw new UserFacingError("Pick which part of this command to run.");
		return this.subcommand ?? "";
	}

	getString(name: string, required: true): string;
	getString(name: string, required?: boolean): string | null;
	getString(name: string, required?: boolean): string | null {
		const raw = this.values.get(name);
		if (raw === undefined) return this.require(name, null, required);

		return this.require(name, String(raw), required);
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
		const raw = this.values.get(name);
		if (raw === undefined) return this.require(name, null, required);

		return this.require(name, raw === true || raw === "true", required);
	}

	getUser(name: string, required: true): User;
	getUser(name: string, required?: boolean): User | null;
	getUser(name: string, required?: boolean): User | null {
		const id = this.id(name);
		if (id === null) return this.require(name, null, required);

		// The cache only: a REST lookup inside an option getter would make one form field a network round trip.
		return this.require(name, this.client.users.cache.get(id) ?? null, required);
	}

	getChannel(name: string, required: true): GuildBasedChannel;
	getChannel(name: string, required?: boolean): GuildBasedChannel | null;
	getChannel(name: string, required?: boolean): GuildBasedChannel | null {
		const id = this.id(name);
		if (id === null) return this.require(name, null, required);

		return this.require(name, this.guild?.channels.cache.get(id) ?? null, required);
	}

	getRole(name: string, required: true): Role;
	getRole(name: string, required?: boolean): Role | null;
	getRole(name: string, required?: boolean): Role | null {
		const id = this.id(name);
		if (id === null) return this.require(name, null, required);

		return this.require(name, this.guild?.roles.cache.get(id) ?? null, required);
	}

	/** There is no upload here, and a command that needs one says so rather than receiving something empty. */
	getAttachment(name: string, required: true): CommandAttachment;
	getAttachment(name: string, required?: boolean): CommandAttachment | null;
	getAttachment(name: string, required?: boolean): CommandAttachment | null {
		if (required === true) throw new UserFacingError(`\`${name}\` is a file, which cannot be sent from here.`);
		return null;
	}

	getFocused(): string {
		return "";
	}

	/** Declared once so a getter cannot read an option the command never asked for. */
	get declaredNames(): string[] {
		return this.declared.map((option) => option.name);
	}

	private id(name: string): string | null {
		const raw = this.values.get(name);
		if (raw === undefined) return null;

		const text = String(raw);
		if (!/^\d{17,20}$/.test(text)) throw new UserFacingError(`\`${name}\` has to be a Discord ID.`);

		return text;
	}

	private number(name: string, valid: (value: number) => boolean): number | null {
		const raw = this.values.get(name);
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

/** A browser request standing in for a slash interaction, with every reply captured rather than sent. */
export class DashboardInteraction implements CommandInput {
	readonly captured: (InteractionReplyOptions | InteractionEditReplyOptions | string)[] = [];
	readonly options: DashboardOptions;
	readonly user: User;
	readonly member: GuildMember | null;
	readonly guild: Guild | null;
	readonly guildId: string | null;
	/** Always null. There is no channel behind an HTTP request, and pretending otherwise would be a lie. */
	readonly channel: TextBasedChannel | null = null;
	readonly client: TestifyClient;
	readonly commandName: string;

	deferred = false;
	replied = false;

	constructor(client: TestifyClient, command: Command, user: User, guild: Guild | null, request: CommandRunRequest) {
		this.client = client;
		this.commandName = command.name;
		this.user = user;
		this.guild = guild;
		this.guildId = guild?.id ?? null;
		this.member = guild?.members.cache.get(user.id) ?? null;
		this.options = new DashboardOptions(
			client,
			guild,
			optionsFor(command, request.subcommand ?? null),
			request.subcommand ?? null,
			request.args,
		);
	}

	deferReply(): Promise<unknown> {
		this.deferred = true;
		return Promise.resolve({});
	}

	reply(options: InteractionReplyOptions): Promise<unknown> {
		this.replied = true;
		this.captured.push(options);
		return Promise.resolve({});
	}

	editReply(options: InteractionEditReplyOptions | string): Promise<unknown> {
		this.replied = true;
		this.captured.push(options);
		return Promise.resolve({});
	}

	followUp(options: InteractionReplyOptions): Promise<unknown> {
		this.captured.push(options);
		return Promise.resolve({});
	}

	fetchReply(): Promise<{ id: string }> {
		return Promise.resolve({ id: "dashboard" });
	}

	showModal(): Promise<never> {
		throw new UserFacingError("That command asks a follow-up question, which only works inside Discord.");
	}
}

/** Anything with a `toJSON` is a builder; anything without is already the API shape. */
function asEmbed(value: unknown): APIEmbed | null {
	if (value === null || typeof value !== "object") return null;

	const candidate = value as { toJSON?: () => APIEmbed };
	return typeof candidate.toJSON === "function" ? candidate.toJSON() : value;
}

/** Flattens a reply into blocks a browser can draw, naming anything that could not cross the gap. */
export function serialiseReply(reply: InteractionReplyOptions | InteractionEditReplyOptions | string): RunOutput[] {
	if (typeof reply === "string") return [{ kind: "text", content: reply }];

	const outputs: RunOutput[] = [];
	const payload = reply as InteractionReplyOptions & { flags?: number | readonly number[] };

	if (typeof payload.content === "string" && payload.content !== "") {
		outputs.push({ kind: "text", content: payload.content });
	}

	for (const raw of payload.embeds ?? []) {
		const embed = asEmbed(raw);
		if (embed === null) continue;

		outputs.push({
			kind: "embed",
			title: embed.title ?? null,
			description: embed.description ?? null,
			colour: embed.color ?? null,
			fields: (embed.fields ?? []).map((field) => ({
				name: field.name,
				value: field.value,
				inline: field.inline === true,
			})),
			footer: embed.footer?.text ?? null,
		});
	}

	if ((payload.components ?? []).length > 0) {
		outputs.push({ kind: "dropped", what: isV2(payload.flags) ? "a Components V2 panel" : "buttons" });
	}

	if ((payload.files ?? []).length > 0) outputs.push({ kind: "dropped", what: "an attachment" });

	return outputs;
}

function isV2(flags: number | readonly number[] | undefined): boolean {
	if (typeof flags === "number") return (flags & MessageFlags.IsComponentsV2) !== 0;
	return (flags ?? []).includes(MessageFlags.IsComponentsV2);
}
