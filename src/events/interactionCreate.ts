import { Events, type Interaction } from "discord.js";
import { SlashContext } from "../adapters/slash";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";
import { toError } from "../core/errors";
import { runCommand } from "../core/execute";
import { dispatchComponent } from "../core/router";

/**
 * The only `interactionCreate` listener in the bot. Everything else routes
 * through the command registry or the component router.
 */
export default defineEvent({
	name: Events.InteractionCreate,
	async execute(client: TestifyClient, interaction: Interaction) {
		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (!command?.autocomplete) return;

			try {
				await command.autocomplete(interaction, client);
			} catch (error) {
				client.logger.error({ err: toError(error), command: interaction.commandName }, "Autocomplete handler failed");
			}
			return;
		}

		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) {
				client.logger.warn({ command: interaction.commandName }, "Received an unknown slash command");
				return;
			}
			await runCommand(new SlashContext(client, interaction), command);
			return;
		}

		if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
			await dispatchComponent(client, interaction);
		}
	},
});
