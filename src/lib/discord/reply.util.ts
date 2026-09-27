import { type InteractionEditReplyOptions, type InteractionReplyOptions } from "discord.js";
import { type CommandInput } from "@core/command";

/** Sends the command's answer. */
export async function reply(interaction: CommandInput, options: InteractionReplyOptions): Promise<void> {
	if (interaction.deferred || interaction.replied) {
		await interaction.editReply(options as InteractionEditReplyOptions);
		return;
	}

	await interaction.reply(options);
}
