import { type InteractionEditReplyOptions, type InteractionReplyOptions } from "discord.js";
import { type CommandInput } from "@core/command";

/**
 * Sends the command's answer.
 *
 * Discord only lets you reply once, and if you called `deferReply()` first you
 * have to use `editReply()` instead. This picks the right one, so you can always
 * just call `reply(interaction, …)`.
 */
export async function reply(interaction: CommandInput, options: InteractionReplyOptions): Promise<void> {
	if (interaction.deferred || interaction.replied) {
		await interaction.editReply(options as InteractionEditReplyOptions);
		return;
	}

	await interaction.reply(options);
}
