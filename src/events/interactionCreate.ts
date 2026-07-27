import { Events, type Interaction, MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { runChecks } from "@core/checks";
import { runButton, runCommand, toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { errorEmbed } from "@lib/embeds";

/** The only `interactionCreate` listener. Everything is routed from here. */
export default defineEvent({
	name: Events.InteractionCreate,
	async run(client, interaction: Interaction) {
		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (!command?.autocomplete) return;

			try {
				await command.autocomplete(interaction, client);
			} catch (error) {
				client.logger.error({ err: toError(error), command: interaction.commandName }, "Autocomplete failed");
			}
			return;
		}

		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) {
				client.logger.warn({ command: interaction.commandName }, "Unknown slash command");
				return;
			}

			const refusal = await runChecks(interaction, command, client);
			if (refusal !== null) {
				await interaction.reply({ embeds: [errorEmbed(refusal)], flags: MessageFlags.Ephemeral });
				return;
			}

			await runCommand(interaction, command, client);
			return;
		}

		if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return;

		const { id, action, args } = parseCustomId(interaction.customId);
		const button = client.buttons.get(id);
		if (!button) return;

		if (button.ownerOnly === true && args.at(-1) !== undefined && args.at(-1) !== interaction.user.id) {
			await interaction.reply({
				embeds: [errorEmbed("Only the person who ran the command can use these.")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await runButton(interaction, () => button.run(interaction, { client, action, args }), client, id);
	},
});
