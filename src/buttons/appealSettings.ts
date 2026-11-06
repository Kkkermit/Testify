import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { APPEAL_SETTINGS_ID, appealSettingsPanel, applyAppealSettings, readAppealSettings } from "@lib/appeals";
import { pickedChannelId } from "@lib/discord";
import { APPEAL_LIMITS } from "@testify/shared";

export default defineButton({
	id: APPEAL_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change ban appeals.");
		}

		const { client } = context;
		const ownerId = interaction.user.id;

		if (context.action === "channel") {
			const channelId = await pickedChannelId(interaction, guild);
			if (channelId === null) return;

			const settings = await applyAppealSettings(client, guild, { channelId }, ownerId);
			await interaction.update(appealSettingsPanel(settings, ownerId, `Appeals will be shown in <#${channelId}>.`));
			return;
		}

		if (context.action === "cooldown" && interaction.isStringSelectMenu()) {
			const days = APPEAL_LIMITS.cooldownChoices.find((choice) => String(choice) === interaction.values[0]);
			if (days === undefined) return;

			const settings = await applyAppealSettings(client, guild, { cooldownDays: days }, ownerId);
			await interaction.update(
				appealSettingsPanel(settings, ownerId, `After a refusal, somebody waits ${String(days)} days.`),
			);
			return;
		}

		if (context.action === "toggle") {
			const current = await readAppealSettings(client, guild);
			const settings = await applyAppealSettings(client, guild, { enabled: !current.enabled }, ownerId);
			await interaction.update(
				appealSettingsPanel(settings, ownerId, settings.enabled ? "Ban appeals are on." : "Ban appeals are off."),
			);
		}
	},
});
