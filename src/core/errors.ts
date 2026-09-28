import { randomBytes } from "node:crypto";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { strings } from "@config/strings";
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

/** Red, with a cross, and a heading when the reader needs telling it was not their doing. */
function failureEmbed(message: string, title?: string): EmbedBuilder {
	const built = new EmbedBuilder().setColor(theme.colours.error);
	return title === undefined
		? built.setDescription(`${theme.emoji.error} ${message}`)
		: built.setTitle(`${theme.emoji.error} ${title}`).setDescription(message);
}

/** Six characters somebody can read out in a bug report, and that find the failure in the log. */
export function errorReference(): string {
	return randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

/** Runs a command so the user always gets an answer, and returns whether it finished cleanly. */
export async function runCommand(interaction: CommandInput, command: Command, client: TestifyClient): Promise<boolean> {
	try {
		await dispatch(interaction, command, client);
		return true;
	} catch (error) {
		await reportFailure(interaction, error, client, command.name, `\`/${command.name}\``);
		return false;
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
		await reportFailure(interaction, error, client, label, null);
	}
}

async function reportFailure(
	interaction: CommandInput | ComponentInteraction,
	error: unknown,
	client: TestifyClient,
	label: string,
	what: string | null,
): Promise<void> {
	if (error instanceof UserFacingError || error instanceof SetupError) {
		if (error instanceof SetupError) client.logger.error({ err: error, command: label }, "Command failed");
		await tell(interaction, failureEmbed(error.message));
		return;
	}

	if (error instanceof ServiceError) {
		client.logger.error({ err: error, command: label }, "Command failed");
		await tell(interaction, failureEmbed(strings.generic.serviceDown(error.service)));
		return;
	}

	const reference = errorReference();
	client.logger.error(
		{ err: toError(error), command: label, reference, user: interaction.user.id, guild: interaction.guildId },
		"Command failed",
	);
	await postToErrorChannel(client, label, reference, interaction, toError(error));
	await tell(interaction, failureEmbed(strings.generic.failure(what, reference), strings.generic.failureTitle));
}

/** Somewhere only the person who asked can see: never over a public reply, and never over a button's message. */
export async function tell(interaction: CommandInput | ComponentInteraction, embed: EmbedBuilder): Promise<void> {
	const privately = { embeds: [embed], flags: MessageFlags.Ephemeral } as const;

	try {
		if ("replyBriefly" in interaction && typeof interaction.replyBriefly === "function") {
			await interaction.replyBriefly(embed);
		} else if (!interaction.deferred && !interaction.replied) {
			await interaction.reply(privately);
		} else if (interaction.deferred && interaction.ephemeral === true) {
			await interaction.editReply({ embeds: [embed] });
		} else {
			// A public "thinking…" would show the error to the channel, so it goes; a button's update keeps its message.
			if (interaction.deferred && interaction.ephemeral === false) await interaction.deleteReply?.();
			await interaction.followUp(privately);
		}
	} catch {
		// The interaction expired or was already answered elsewhere. Nothing more
	}
}

async function postToErrorChannel(
	client: TestifyClient,
	label: string,
	reference: string,
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
						{ name: "Reference", value: `\`${reference}\``, inline: true },
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
