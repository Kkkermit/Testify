import { EmbedBuilder, MessageFlags } from "discord.js";
import { theme } from "@config/theme";
import { type ComponentInteraction } from "@core/button";
import { type TestifyClient } from "@core/client";
import { type Command, type CommandInput, dispatch } from "@core/command";

/** Throw this when the user needs to read the message — a bad argument, not enough money, a missing role. */
export class UserFacingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserFacingError";
	}
}

/** An external API failed. */
export class ServiceError extends Error {
	constructor(
		readonly service: string,
		override readonly cause: unknown,
	) {
		super(`${service} is not responding`);
		this.name = "ServiceError";
	}
}

/** A required setting is missing, so a feature cannot run at all. */
export class SetupError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SetupError";
	}
}

export function toError(value: unknown): Error {
	if (value instanceof Error) return value;
	return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

/** Red, with a cross. */
function failureEmbed(message: string): EmbedBuilder {
	return new EmbedBuilder().setColor(theme.colours.error).setDescription(`${theme.emoji.error} ${message}`);
}

/** Runs a command and makes sure the user always gets an answer, whatever happens. */
export async function runCommand(interaction: CommandInput, command: Command, client: TestifyClient): Promise<void> {
	try {
		await dispatch(interaction, command, client);
	} catch (error) {
		await reportFailure(interaction, error, client, command.name);
	}
}

export async function runButton(
	interaction: ComponentInteraction,
	handler: () => Promise<void>,
	client: TestifyClient,
	label: string,
): Promise<void> {
	try {
		await handler();
	} catch (error) {
		await reportFailure(interaction, error, client, label);
	}
}

async function reportFailure(
	interaction: CommandInput | ComponentInteraction,
	error: unknown,
	client: TestifyClient,
	label: string,
): Promise<void> {
	const userFacing = error instanceof UserFacingError;
	const setup = error instanceof SetupError;
	const service = error instanceof ServiceError;

	const message = userFacing
		? error.message
		: setup
			? error.message
			: service
				? `${error.service} is not responding right now. Try again in a bit.`
				: "Something went wrong. The problem has been logged.";

	if (!userFacing) {
		client.logger.error(
			{ err: toError(error), command: label, user: interaction.user.id, guild: interaction.guildId },
			"Command failed",
		);
		if (!setup && !service) await postToErrorChannel(client, label, interaction, toError(error));
	}

	await tell(interaction, message);
}

async function tell(interaction: CommandInput | ComponentInteraction, message: string): Promise<void> {
	const payload = { embeds: [failureEmbed(message)], flags: MessageFlags.Ephemeral } as const;

	try {
		if (interaction.deferred) await interaction.editReply({ embeds: payload.embeds });
		else if (interaction.replied) await interaction.followUp(payload);
		else await interaction.reply(payload);
	} catch {
		// The interaction expired or was already answered elsewhere. Nothing more
	}
}

async function postToErrorChannel(
	client: TestifyClient,
	label: string,
	interaction: CommandInput | ComponentInteraction,
	error: Error,
): Promise<void> {
	const channelId = client.env.CHANNEL_ERROR_LOG;
	if (!channelId) return;

	try {
		const channel = await client.channels.fetch(channelId);
		if (!channel?.isTextBased() || !channel.isSendable()) return;

		await channel.send({
			embeds: [
				new EmbedBuilder()
					.setColor(theme.colours.error)
					.setTitle("Command failed")
					.setTimestamp()
					.addFields(
						{ name: "Command", value: `\`${label}\``, inline: true },
						{ name: "User", value: `${interaction.user.username} (${interaction.user.id})`, inline: true },
						{ name: "Server", value: interaction.guild?.name ?? "Direct message", inline: true },
						{ name: "Error", value: `\`\`\`\n${(error.stack ?? error.message).slice(0, 1_000)}\n\`\`\`` },
					),
			],
		});
	} catch (reportError) {
		client.logger.warn({ err: toError(reportError) }, "Could not post to the error channel");
	}
}
