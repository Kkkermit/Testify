import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { pickedChannelId } from "@lib/discord";
import { applyIdeaSettings, IDEA_SETTINGS_ID, ideaSettingsPanel, readIdeaSettings } from "@lib/ideas";

/** The controls on `/idea settings`, each applied the moment it is pressed. */
export default defineButton({
	id: IDEA_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the idea board.");
		}

		const ownerId = interaction.user.id;

		if (context.action === "channel") {
			const channelId = await pickedChannelId(interaction, guild);
			if (channelId === null) return;

			const settings = await applyIdeaSettings(guild, { channelId }, ownerId);
			await interaction.update(ideaSettingsPanel(settings, ownerId, `Ideas will be posted in <#${channelId}>.`));
			return;
		}

		if (context.action === "toggle") {
			const current = await readIdeaSettings(guild);
			const settings = await applyIdeaSettings(guild, { enabled: !current.enabled }, ownerId);
			await interaction.update(
				ideaSettingsPanel(settings, ownerId, settings.enabled ? "The idea board is on." : "The idea board is off."),
			);
		}
	},
});
