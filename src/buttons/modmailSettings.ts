import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { pickedChannelId } from "@lib/discord";
import { applyModmailSettings, MODMAIL_SETTINGS_ID, modmailSettingsPanel, readModmailSettings } from "@lib/modmail";

export default defineButton({
	id: MODMAIL_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change mod mail.");
		}

		const ownerId = interaction.user.id;

		if (context.action === "channel") {
			const channelId = await pickedChannelId(interaction, guild);
			if (channelId === null) return;

			const settings = await applyModmailSettings(guild, { channelId }, ownerId);
			await interaction.update(modmailSettingsPanel(settings, ownerId, `Threads will be made in <#${channelId}>.`));
			return;
		}

		if (context.action === "ping" && interaction.isRoleSelectMenu()) {
			const pingRoleId = interaction.values[0] ?? null;
			const settings = await applyModmailSettings(guild, { pingRoleId }, ownerId);
			const note =
				pingRoleId === null ? "Nobody is pinged when one opens." : `<@&${pingRoleId}> is pinged when one opens.`;
			await interaction.update(modmailSettingsPanel(settings, ownerId, note));
			return;
		}

		if (context.action === "signed" && interaction.isStringSelectMenu()) {
			const anonymous = interaction.values[0] === "anonymous";
			const settings = await applyModmailSettings(guild, { anonymous }, ownerId);
			const note = anonymous ? "Replies are signed as the server's staff." : "Replies are signed with each name.";
			await interaction.update(modmailSettingsPanel(settings, ownerId, note));
			return;
		}

		if (context.action === "toggle") {
			const current = await readModmailSettings(guild);
			const settings = await applyModmailSettings(guild, { enabled: !current.enabled }, ownerId);
			await interaction.update(
				modmailSettingsPanel(settings, ownerId, settings.enabled ? "Mod mail is on." : "Mod mail is off."),
			);
		}
	},
});
