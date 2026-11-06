import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { applyInviteSettings, INVITE_SETTINGS_ID, inviteSettingsPanel, readInviteSettings } from "@lib/invites";

export default defineButton({
	id: INVITE_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change invite tracking.");
		}

		const ownerId = interaction.user.id;

		if (context.action === "channel" && interaction.isChannelSelectMenu()) {
			const logChannelId = interaction.values[0] ?? null;
			const settings = await applyInviteSettings(guild, { logChannelId }, ownerId);
			const note =
				logChannelId === null ? "Joins are not announced." : `Joins will be announced in <#${logChannelId}>.`;
			await interaction.update(inviteSettingsPanel(settings, ownerId, note));
			return;
		}

		if (context.action === "toggle") {
			const current = await readInviteSettings(guild);
			const settings = await applyInviteSettings(guild, { enabled: !current.enabled }, ownerId);
			await interaction.update(
				inviteSettingsPanel(settings, ownerId, settings.enabled ? "Invite tracking is on." : "Invite tracking is off."),
			);
		}
	},
});
