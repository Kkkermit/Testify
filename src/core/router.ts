import { MessageFlags } from "discord.js";
import { strings } from "../config/strings";
import { type TestifyClient } from "./client";
import { type ComponentContext, type ComponentInteraction } from "./component";
import { decodeId } from "./customId";
import { isUserFacing, toError } from "./errors";
import { errorEmbed } from "../ui/embeds";

/**
 * One `interactionCreate` listener and an O(1) namespace lookup, replacing the
 * twenty-seven concurrent listeners that each type-guarded and string-matched
 * independently.
 */
export async function dispatchComponent(client: TestifyClient, interaction: ComponentInteraction): Promise<void> {
	const { ns, action, args } = decodeId(interaction.customId);
	const handler = client.components.get(ns);

	if (!handler) {
		client.logger.debug({ customId: interaction.customId }, "No component handler for namespace");
		return;
	}

	if (handler.ownerOnly === true) {
		const ownerId = args.at(-1);
		if (ownerId !== undefined && ownerId !== interaction.user.id) {
			await interaction.reply({
				embeds: [errorEmbed(strings.generic.notYourComponent)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	}

	const ctx: ComponentContext = { client, interaction, action, args };

	try {
		await handler.handle(ctx);
	} catch (error) {
		const err = toError(error);
		const message = isUserFacing(error) ? error.message : strings.generic.error;

		if (!isUserFacing(error)) {
			client.logger.error(
				{ err, namespace: ns, action, userId: interaction.user.id, guildId: interaction.guildId },
				"Component handler failed",
			);
		}

		await respondWithError(interaction, message);
	}
}

async function respondWithError(interaction: ComponentInteraction, message: string): Promise<void> {
	const payload = { embeds: [errorEmbed(message)], flags: MessageFlags.Ephemeral } as const;
	try {
		if (interaction.deferred || interaction.replied) {
			await interaction.followUp(payload);
		} else {
			await interaction.reply(payload);
		}
	} catch {
		// The interaction token expired or the component was already acknowledged
		// elsewhere. Nothing further can be surfaced to the user.
	}
}
