import { type EmbedBuilder, embedLength } from "discord.js";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { chosenSubcommand, type Command, type CommandInput, type GivenOption, givenOptions } from "@core/command";
import { postToLogChannel } from "@lib/bot/logChannel.util";
import {
	loggedChannelText,
	loggedGuildText,
	logAuthor,
	type LoggedGuild,
	loggedChannel,
	loggedGuild,
	type LoggedPlace,
	type LoggedUser,
	loggedUser,
	loggedOptionsText,
	loggedUserText,
} from "@lib/bot/logFields.util";
import { embed } from "@lib/discord/embeds.util";

/** Every command run, gathered in memory and posted a batch at a time: slash and prefix each to their own channel. */

export type CommandSurface = "slash" | "prefix";

export interface CommandLogEntry {
	surface: CommandSurface;
	/** With its subcommand, e.g. `music play`. */
	name: string;
	/** `/` for slash, the server's own prefix for prefix. */
	prefix: string;
	/** What was actually typed, when it differs from the name: an alias, or `T?` for `t?`. */
	typed: string | null;
	options: GivenOption[];
	user: LoggedUser;
	guild: LoggedGuild | null;
	channel: LoggedPlace | null;
	ok: boolean;
	durationMs: number;
	at: number;
}

/** What the dispatcher knows about a run that the input does not. */
export interface CommandRun {
	surface: CommandSurface;
	ok: boolean;
	durationMs: number;
	/** A slash interaction can arrive from a channel the cache does not hold. */
	channelId: string | null;
	prefix?: string;
	typed?: string;
}

export const COMMAND_LOG_LIMITS = {
	/** Past this, the oldest waiting entries are dropped and counted, so a flood cannot grow memory for ever. */
	maxWaiting: 1_000,
	/** Discord allows five messages every five seconds in a channel, so one flush never sends more. */
	messagesPerFlush: 5,
	/** Discord's caps on one message: ten embeds, and 6,000 characters across them. */
	embedsPerMessage: 10,
	charactersPerMessage: 6_000,
} as const;

export function commandLogEntry(
	input: CommandInput,
	command: Command,
	run: CommandRun,
	at = Date.now(),
): CommandLogEntry {
	const subcommand = chosenSubcommand(input, command);
	const name = subcommand === null ? command.name : `${command.name} ${subcommand}`;
	const prefix = run.surface === "slash" ? "/" : (run.prefix ?? "");

	return {
		surface: run.surface,
		name,
		prefix,
		typed: run.typed !== undefined && run.typed !== `${prefix}${name}` ? run.typed : null,
		options: givenOptions(input, command),
		user: loggedUser(input.user),
		guild: loggedGuild(input.guild),
		channel: input.guild === null ? null : loggedChannel(input.channel, run.channelId),
		ok: run.ok,
		durationMs: run.durationMs,
		at,
	};
}

export function commandLogEmbed(entry: CommandLogEntry): EmbedBuilder {
	const fields = [
		{ name: "User", value: loggedUserText(entry.user), inline: true },
		{ name: "Server", value: loggedGuildText(entry.guild), inline: true },
		{ name: "Channel", value: loggedChannelText(entry.channel), inline: true },
	];
	if (entry.options.length > 0)
		fields.push({ name: "Options", value: loggedOptionsText(entry.options), inline: false });
	fields.push(
		{ name: "Result", value: entry.ok ? "Worked" : "Failed · see the error log", inline: true },
		{ name: "Took", value: `${String(Math.round(entry.durationMs))} ms`, inline: true },
	);
	if (entry.typed !== null) fields.push({ name: "Typed as", value: `\`${entry.typed}\``, inline: true });

	return embed({
		colour: entry.ok ? theme.colours.success : theme.colours.error,
		author: logAuthor(entry.user),
		title: `${entry.ok ? theme.emoji.success : theme.emoji.error} ${entry.prefix}${entry.name}`,
		fields,
		thumbnail: entry.user.avatarUrl,
		footer: `${entry.surface === "slash" ? "Slash" : "Prefix"} command · ${entry.guild?.name ?? "Direct message"}`,
		footerIcon: entry.guild?.iconUrl ?? undefined,
	}).setTimestamp(entry.at);
}

export class CommandLog {
	#waiting: CommandLogEntry[] = [];
	#dropped = 0;

	record(entry: CommandLogEntry): void {
		this.#waiting.push(entry);
		if (this.#waiting.length > COMMAND_LOG_LIMITS.maxWaiting) {
			this.#waiting.shift();
			this.#dropped += 1;
		}
	}

	get size(): number {
		return this.#waiting.length;
	}

	/** Takes what fits in one flush, an embed per run; anything left waits for the next. */
	take(): { batches: EmbedBuilder[][]; dropped: number } {
		const batches: EmbedBuilder[][] = [];
		let current: EmbedBuilder[] = [];
		let length = 0;
		let taken = 0;

		for (const entry of this.#waiting) {
			const built = commandLogEmbed(entry);
			const size = embedLength(built.toJSON());

			if (
				current.length === COMMAND_LOG_LIMITS.embedsPerMessage ||
				(current.length > 0 && length + size > COMMAND_LOG_LIMITS.charactersPerMessage)
			) {
				batches.push(current);
				current = [];
				length = 0;
				if (batches.length === COMMAND_LOG_LIMITS.messagesPerFlush) break;
			}
			current.push(built);
			length += size;
			taken += 1;
		}
		if (current.length > 0) batches.push(current);

		this.#waiting = this.#waiting.slice(taken);
		const dropped = this.#dropped;
		this.#dropped = 0;

		return { batches, dropped };
	}
}

export type CommandLogs = Record<CommandSurface, CommandLog>;

export const commandLogs: CommandLogs = { slash: new CommandLog(), prefix: new CommandLog() };

export function commandLogChannel(client: TestifyClient, surface: CommandSurface): string | undefined {
	return surface === "slash" ? client.env.CHANNEL_SLASH_COMMAND_LOG : client.env.CHANNEL_PREFIX_COMMAND_LOG;
}

/** Notes a command run, when the operator has a log channel for its surface to post it to. */
export function logCommandUse(
	client: TestifyClient,
	input: CommandInput,
	command: Command,
	run: CommandRun,
	logs: CommandLogs = commandLogs,
): void {
	if (commandLogChannel(client, run.surface) === undefined) return;
	logs[run.surface].record(commandLogEntry(input, command, run));
}

/** Posts what has gathered since the last flush; a failed post is dropped rather than retried into a backlog. */
export async function flushCommandLog(client: TestifyClient, logs: CommandLogs = commandLogs): Promise<void> {
	for (const surface of ["slash", "prefix"] as const) {
		const channelId = commandLogChannel(client, surface);
		const log = logs[surface];
		if (channelId === undefined || log.size === 0) continue;

		const { batches, dropped } = log.take();
		for (const [index, embeds] of batches.entries()) {
			const landed = await postToLogChannel(client, channelId, {
				...(index === 0 && dropped > 0
					? { content: `-# ${String(dropped)} more were dropped while the log was backed up.` }
					: {}),
				embeds,
				allowedMentions: { parse: [] },
			});
			if (!landed) break;
		}
	}
}
