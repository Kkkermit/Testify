import { ButtonStyle, EmbedBuilder, type TextChannel } from "discord.js";
import { strings } from "../config/strings";
import { theme } from "../config/theme";
import { button, row } from "../ui/components";
import { errorEmbed } from "../ui/embeds";
import { truncate } from "../ui/format";
import { type SharedCommand } from "./command";
import { type CommandContext } from "./context";
import { encodeId, Namespace } from "./customId";
import { CooldownError, isUserFacing, toError } from "./errors";
import { runMiddleware } from "./middleware";

/**
 * The single entry point for running a command, on either surface. The previous
 * code reported errors only on the slash path — prefix errors escaped their
 * try/catch entirely because the dispatcher never awaited `execute`.
 */
export async function runCommand(ctx: CommandContext, command: SharedCommand): Promise<void> {
	const gate = await runMiddleware(ctx, command);
	if (!gate.ok) {
		await safeReply(ctx, { embeds: [errorEmbed(gate.reason)], ephemeral: gate.ephemeral ?? true });
		return;
	}

	try {
		await command.execute(ctx);
	} catch (error) {
		await handleCommandError(ctx, command, error);
	}
}

async function handleCommandError(ctx: CommandContext, command: SharedCommand, error: unknown): Promise<void> {
	if (isUserFacing(error)) {
		const message = error instanceof CooldownError ? error.message : error.message;
		await safeReply(ctx, { embeds: [errorEmbed(message)], ephemeral: true });
		return;
	}

	const err = toError(error);
	ctx.client.logger.error(
		{
			err,
			command: command.name,
			surface: ctx.surface,
			userId: ctx.user.id,
			guildId: ctx.guild?.id ?? null,
		},
		"Command failed",
	);

	await reportToErrorChannel(ctx, command, err);
	await safeReply(ctx, { embeds: [errorEmbed(strings.generic.error)], ephemeral: true });
}

/** Posts a triage embed with recolour buttons to the configured error channel. */
export async function reportToErrorChannel(ctx: CommandContext, command: SharedCommand, error: Error): Promise<void> {
	const channelId = ctx.client.env.CHANNEL_COMMAND_ERROR_LOG;
	if (channelId === undefined) return;

	try {
		const channel = await ctx.client.channels.fetch(channelId);
		if (!channel?.isTextBased() || !channel.isSendable()) return;

		const embed = new EmbedBuilder()
			.setColor(theme.colors.error)
			.setTimestamp()
			.setAuthor({ name: `${theme.brand.name} command error` })
			.setTitle(`Command execution error ${theme.emoji.arrow}`)
			.addFields(
				{ name: "Command", value: `\`${command.name}\``, inline: true },
				{ name: "Surface", value: `\`${ctx.surface}\``, inline: true },
				{ name: "User", value: `\`${ctx.user.username}\` (${ctx.user.id})`, inline: true },
				{ name: "Guild", value: ctx.guild ? `\`${ctx.guild.name}\`` : "`Direct message`", inline: true },
				{ name: "Error", value: `\`\`\`\n${truncate(error.stack ?? error.message, 1_000)}\n\`\`\`` },
			);

		const controls = row(
			button({
				id: encodeId(Namespace.ErrorTriage, "pending"),
				label: "Mark as pending",
				style: ButtonStyle.Primary,
			}),
			button({ id: encodeId(Namespace.ErrorTriage, "solved"), label: "Mark as solved", style: ButtonStyle.Success }),
			button({
				id: encodeId(Namespace.ErrorTriage, "unsolved"),
				label: "Mark as unsolved",
				style: ButtonStyle.Danger,
			}),
		);

		await (channel as TextChannel).send({ embeds: [embed], components: [controls] });
	} catch (reportError) {
		ctx.client.logger.warn({ err: toError(reportError) }, "Could not post to the error channel");
	}
}

/** A failing reply must never mask the error that caused it. */
async function safeReply(ctx: CommandContext, options: Parameters<CommandContext["reply"]>[0]): Promise<void> {
	try {
		if (ctx.replied || ctx.deferred) {
			await ctx.followUp(options);
		} else {
			await ctx.reply(options);
		}
	} catch (error) {
		ctx.client.logger.debug({ err: toError(error) }, "Could not deliver the error reply");
	}
}
