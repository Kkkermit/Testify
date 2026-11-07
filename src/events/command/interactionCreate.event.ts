import {
	type ChatInputCommandInteraction,
	type ContextMenuCommandInteraction,
	DiscordAPIError,
	Events,
	type Interaction,
	type MessageComponentInteraction,
	MessageFlags,
	type ModalSubmitInteraction,
	RESTJSONErrorCodes,
} from "discord.js";
import { botName } from "@core/brand";
import { parseCustomId } from "@core/button";
import { checkContextMenu, runChecks } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { runButton, runCommand, toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { readerLanguage, say } from "@core/language";
import { countCommandUse, logCommandUse, recordCommandTime } from "@lib/bot";
import { errorEmbed, refusalEmbed } from "@lib/discord";
import { mentionNoticesAfterCommand, NOTICE_COMMAND, noticeHint } from "@lib/notices";
import { commandIsOff, partIsOff } from "@testify/shared";

type Answerable =
	ChatInputCommandInteraction | ContextMenuCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;

/** A switched-off feature's button, command or action can still arrive from an old message or Discord's cached menu. */
async function refuseSwitchedOff(interaction: Answerable): Promise<void> {
	await interaction.reply({
		embeds: [refusalEmbed(say(readerLanguage(interaction), "featureOff", { bot: botName() }))],
		flags: MessageFlags.Ephemeral,
	});
}

async function runContextMenu(client: TestifyClient, interaction: ContextMenuCommandInteraction): Promise<void> {
	const menu = client.contextMenus.get(interaction.commandName);
	if (!menu) {
		if (partIsOff(client.featuresOff, "menus", interaction.commandName)) await refuseSwitchedOff(interaction);
		return;
	}
	if (!interaction.inCachedGuild()) return;

	const refusal = await checkContextMenu(client, interaction, menu);
	if (refusal !== null) {
		await interaction.reply({ embeds: [refusalEmbed(refusal)], flags: MessageFlags.Ephemeral });
		return;
	}

	await runButton(
		interaction,
		async () => {
			if (menu.type === "user" && interaction.isUserContextMenuCommand()) await menu.run(interaction, client);
			if (menu.type === "message" && interaction.isMessageContextMenuCommand()) await menu.run(interaction, client);
		},
		client,
		menu.name,
	);
}

/** The only `interactionCreate` listener. */
export default defineEvent({
	name: Events.InteractionCreate,
	async run(client, interaction: Interaction) {
		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName);
			if (!command?.autocomplete) return;

			try {
				await command.autocomplete(interaction, client);
			} catch (error) {
				const command = interaction.commandName;

				// Discord drops a keystroke's interaction when the next one arrives, so an answer crossing it is routine.
				if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownInteraction) {
					const ageMs = Date.now() - interaction.createdTimestamp;
					client.logger.trace({ command, ageMs }, "[AUTOCOMPLETE] Answered an interaction that had already expired.");
				} else {
					client.logger.error({ err: toError(error), command }, "[AUTOCOMPLETE_ERROR] An autocomplete failed.");
				}
			}
			return;
		}

		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			const subcommand = interaction.options.getSubcommand(false);
			if (commandIsOff(client.featuresOff, interaction.commandName, subcommand)) {
				await refuseSwitchedOff(interaction);
				return;
			}
			if (!command) {
				client.logger.warn(
					{ command: interaction.commandName },
					"[COMMAND] Received a slash command the bot does not have. Reload Discord if it was removed.",
				);
				return;
			}

			const refusal = await runChecks(interaction, command, client);
			if (refusal !== null) {
				await interaction.reply({ embeds: [refusalEmbed(refusal)], flags: MessageFlags.Ephemeral });
				return;
			}

			const started = Date.now();
			const { ok, reference } = await runCommand(interaction, command, client);
			const durationMs = Date.now() - started;
			recordCommandTime(durationMs, ok);
			const run = { surface: "slash", ok, reference, durationMs, channelId: interaction.channelId } as const;
			countCommandUse(client, interaction, command, run);
			logCommandUse(client, interaction, command, run);
			mentionNoticesAfterCommand(interaction.user.id, client.logger, (unread) =>
				interaction.followUp({ embeds: [noticeHint(unread, `/${NOTICE_COMMAND}`)], flags: MessageFlags.Ephemeral }),
			);
			return;
		}

		if (interaction.isContextMenuCommand()) {
			await runContextMenu(client, interaction);
			return;
		}

		if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return;

		const { id, action, args } = parseCustomId(interaction.customId);
		const button = client.buttons.get(id);
		if (!button) {
			if (partIsOff(client.featuresOff, "buttons", id)) await refuseSwitchedOff(interaction);
			return;
		}

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
