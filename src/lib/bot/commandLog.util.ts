import { type EmbedBuilder } from "discord.js";
import { type TestifyClient } from "@core/client";
import { postToLogChannel } from "@lib/bot/logChannel.util";
import { embed } from "@lib/discord/embeds.util";

/** Every command run, gathered in memory and posted a batch at a time: slash and prefix each to their own channel. */

export type CommandSurface = "slash" | "prefix";

export interface CommandLogEntry {
	command: string;
	subcommand: string | null;
	surface: CommandSurface;
	userId: string;
	username: string;
	guildName: string | null;
	channelId: string | null;
	ok: boolean;
	at: number;
}

export const COMMAND_LOG_LIMITS = {
	/** Past this, the oldest waiting entries are dropped and counted, so a flood cannot grow memory for ever. */
	maxWaiting: 1_000,
	/** Discord allows five messages every five seconds in a channel, so one flush never sends more. */
	messagesPerFlush: 5,
	/** Under Discord's 4,096-character embed description. */
	charactersPerMessage: 3_900,
} as const;

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

	/** Takes what fits in one flush; anything left waits for the next. */
	take(): { lines: string[][]; dropped: number } {
		const messages: string[][] = [];
		let current: string[] = [];
		let length = 0;

		for (const entry of this.#waiting) {
			const line = commandLogLine(entry);
			if (length + line.length + 1 > COMMAND_LOG_LIMITS.charactersPerMessage && current.length > 0) {
				messages.push(current);
				if (messages.length === COMMAND_LOG_LIMITS.messagesPerFlush) break;
				current = [];
				length = 0;
			}
			current.push(line);
			length += line.length + 1;
		}
		if (current.length > 0 && messages.length < COMMAND_LOG_LIMITS.messagesPerFlush) messages.push(current);

		this.#waiting = this.#waiting.slice(messages.reduce((sum, lines) => sum + lines.length, 0));
		const dropped = this.#dropped;
		this.#dropped = 0;

		return { lines: messages, dropped };
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
	entry: Omit<CommandLogEntry, "at">,
	logs: CommandLogs = commandLogs,
): void {
	if (commandLogChannel(client, entry.surface) === undefined) return;
	logs[entry.surface].record({ ...entry, at: Date.now() });
}

/** One command run as one line; what was typed into it is never included. */
export function commandLogLine(entry: CommandLogEntry): string {
	const name = entry.subcommand === null ? entry.command : `${entry.command} ${entry.subcommand}`;
	const where =
		entry.guildName === null
			? "Direct message"
			: `${entry.guildName}${entry.channelId !== null ? ` · <#${entry.channelId}>` : ""}`;

	return (
		`<t:${String(Math.floor(entry.at / 1_000))}:T> ${entry.ok ? "✅" : "❌"} ` +
		`\`${entry.surface === "slash" ? "/" : "prefix "}${name}\` · ` +
		`**${entry.username}** (\`${entry.userId}\`) · ${where}`
	);
}

export function commandLogEmbed(surface: CommandSurface, lines: string[], dropped: number): EmbedBuilder {
	const note = dropped > 0 ? `\n-# ${String(dropped)} more were dropped while the log was backed up.` : "";
	return embed({
		category: "developer",
		title: surface === "slash" ? "Slash commands" : "Prefix commands",
		description: `${lines.join("\n")}${note}`,
	});
}

/** Posts what has gathered since the last flush; a failed post is dropped rather than retried into a backlog. */
export async function flushCommandLog(client: TestifyClient, logs: CommandLogs = commandLogs): Promise<void> {
	for (const surface of ["slash", "prefix"] as const) {
		const channelId = commandLogChannel(client, surface);
		const log = logs[surface];
		if (channelId === undefined || log.size === 0) continue;

		const { lines, dropped } = log.take();
		for (const [index, batch] of lines.entries()) {
			const landed = await postToLogChannel(client, channelId, {
				embeds: [commandLogEmbed(surface, batch, index === 0 ? dropped : 0)],
				allowedMentions: { parse: [] },
			});
			if (!landed) break;
		}
	}
}
