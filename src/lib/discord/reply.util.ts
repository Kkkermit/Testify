import { type InteractionEditReplyOptions, type InteractionReplyOptions, MessageFlags } from "discord.js";
import { type ComponentInteraction } from "@core/button";
import { type CommandInput } from "@core/command";
import { type ContainerMessage } from "@lib/discord/discord.types";

export async function reply(interaction: CommandInput, options: InteractionReplyOptions): Promise<void> {
	if (interaction.deferred || interaction.replied) {
		await interaction.editReply(options as InteractionEditReplyOptions);
		return;
	}

	await interaction.reply(options);
}

/** Redraws a panel in place, or answers privately when its form was opened from somewhere the panel cannot be edited. */
export async function redrawPanel(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	if (!interaction.isModalSubmit()) {
		await interaction.update(panel);
	} else if (interaction.isFromMessage()) {
		await interaction.update(panel);
	} else {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	}
}
