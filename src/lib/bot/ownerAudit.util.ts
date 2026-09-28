import { AttachmentBuilder, type EmbedBuilder, type MessageCreateOptions } from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { theme } from "@config/theme";
import { type TestifyClient } from "@core/client";
import { chosenSubcommand, type Command, type CommandInput, givenOptions } from "@core/command";
import { postToLogChannel } from "@lib/bot/logChannel.util";
import {
	logAuthor,
	loggedChannel,
	loggedChannelText,
	loggedGuild,
	loggedGuildText,
	loggedUser,
	loggedUserText,
} from "@lib/bot/logFields.util";
import { embed } from "@lib/discord/embeds.util";
import { truncate } from "@lib/format/format.util";

/** The owner's record of every `/eval` run and of anybody else reaching for an owner-only command. */

export const OWNER_AUDIT_LIMITS = {
	/** One post per person per command in this window; the next says how many were held back. */
	postGapMs: MINUTE_MS,
	/** People remembered by the throttle before the oldest is forgotten. */
	remembered: 500,
	/** Code longer than this goes up as a file rather than into the embed. */
	inlineCode: 3_800,
} as const;

export function ownerLogChannel(client: TestifyClient): string | undefined {
	return client.env.CHANNEL_EVAL_LOG ?? client.env.CHANNEL_ERROR_LOG;
}

export class AttemptThrottle {
	#seen = new Map<string, { at: number; held: number }>();

	/** Null when this attempt is inside the gap; otherwise how many were held back since the last post. */
	admit(key: string, now: number): number | null {
		const last = this.#seen.get(key);
		if (last !== undefined && now - last.at < OWNER_AUDIT_LIMITS.postGapMs) {
			last.held += 1;
			return null;
		}

		this.#seen.delete(key);
		this.#seen.set(key, { at: now, held: 0 });
		if (this.#seen.size > OWNER_AUDIT_LIMITS.remembered) {
			const oldest = this.#seen.keys().next().value;
			if (oldest !== undefined) this.#seen.delete(oldest);
		}
		return last?.held ?? 0;
	}
}

const attempts = new AttemptThrottle();

function commandName(input: CommandInput, command: Command): string {
	const subcommand = chosenSubcommand(input, command);
	return subcommand === null ? command.name : `${command.name} ${subcommand}`;
}

// A backtick run inside the code would close the block early.
function codeBlock(code: string, max: number): string {
	return `\`\`\`js\n${truncate(code.replaceAll("```", "`​``"), max)}\n\`\`\``;
}

function whoAndWhere(input: CommandInput): { name: string; value: string; inline: boolean }[] {
	return [
		{ name: "User", value: loggedUserText(loggedUser(input.user)), inline: true },
		{ name: "Server", value: loggedGuildText(loggedGuild(input.guild)), inline: true },
		{
			name: "Channel",
			value: loggedChannelText(input.guild === null ? null : loggedChannel(input.channel, null)),
			inline: true,
		},
	];
}

export function ownerAttemptEmbed(input: CommandInput, command: Command, held: number): EmbedBuilder {
	const user = loggedUser(input.user);
	const given = givenOptions(input, command);
	const tried = given
		.map(({ name, value }) => `**${name}**\n${codeBlock(value ?? "(not logged)", 1_000)}`)
		.join("\n")
		.slice(0, OWNER_AUDIT_LIMITS.inlineCode);

	const fields = whoAndWhere(input);
	if (held > 0) {
		fields.push({ name: "Held back", value: `${String(held)} more tries in the minute before this`, inline: false });
	}

	return embed({
		colour: theme.colours.severe,
		author: logAuthor(user),
		title: `🚨 Owner-only command refused · /${commandName(input, command)}`,
		description: `Somebody who is not in \`DISCORD_OWNER_IDS\` tried to run it. Nothing ran.${tried === "" ? "" : `\n\n${tried}`}`,
		fields,
		thumbnail: user.avatarUrl,
		footer: `User ID ${user.id}`,
	});
}

/** Refused, always: this only records it, in the log and in the owner's channel. */
export async function reportOwnerAttempt(
	client: TestifyClient,
	input: CommandInput,
	command: Command,
	throttle: AttemptThrottle = attempts,
): Promise<void> {
	client.logger.warn(
		{
			command: commandName(input, command),
			userId: input.user.id,
			username: input.user.username,
			guildId: input.guildId,
			options: givenOptions(input, command),
		},
		"[OWNER_COMMAND] Somebody who is not an owner tried an owner-only command. It was refused and nothing ran.",
	);

	const held = throttle.admit(`${input.user.id}:${command.name}`, Date.now());
	const channelId = ownerLogChannel(client);
	if (held === null || channelId === undefined) return;

	await postToLogChannel(client, channelId, {
		embeds: [ownerAttemptEmbed(input, command, held)],
		allowedMentions: { parse: [] },
	});
}

export interface EvalRecord {
	code: string;
	/** Already redacted. */
	output: string;
	failed: boolean;
	elapsedMs: number;
}

export function evalLogMessage(input: CommandInput, record: EvalRecord): MessageCreateOptions {
	const user = loggedUser(input.user);
	const long = record.code.length > OWNER_AUDIT_LIMITS.inlineCode;

	const built = embed({
		colour: record.failed ? theme.colours.error : theme.colours.success,
		author: logAuthor(user),
		title: `🧪 /eval ${record.failed ? "threw" : "ran"}`,
		description: long
			? `The code is ${String(record.code.length)} characters long, so it is attached in full.`
			: codeBlock(record.code, OWNER_AUDIT_LIMITS.inlineCode),
		fields: [
			...whoAndWhere(input),
			{ name: "Result", value: record.failed ? "Threw" : "Returned", inline: true },
			{ name: "Took", value: `${record.elapsedMs.toFixed(2)} ms`, inline: true },
			{ name: "Output", value: codeBlock(record.output, 1_000), inline: false },
		],
		thumbnail: user.avatarUrl,
		footer: `User ID ${user.id}`,
	});

	return {
		embeds: [built],
		...(long ? { files: [new AttachmentBuilder(Buffer.from(record.code), { name: "eval.js" })] } : {}),
		allowedMentions: { parse: [] },
	};
}

export async function reportEval(client: TestifyClient, input: CommandInput, record: EvalRecord): Promise<void> {
	client.logger.warn(
		{ userId: input.user.id, guildId: input.guildId, code: record.code, failed: record.failed },
		"[EVAL] The owner ran /eval.",
	);

	const channelId = ownerLogChannel(client);
	if (channelId !== undefined) await postToLogChannel(client, channelId, evalLogMessage(input, record));
}
