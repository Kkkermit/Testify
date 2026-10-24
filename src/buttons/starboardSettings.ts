import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { modalForm, pickedChannelId } from "@lib/discord";
import {
	applyStarboardSettings,
	parseThreshold,
	readStarboardSettings,
	STARBOARD_SETTINGS_ID,
	starboardSettingsPanel,
} from "@lib/starboard";
import { STARBOARD_LIMITS } from "@testify/shared";

/** The controls on `/starboard`, each applied the moment it is pressed. */
export default defineButton({
	id: STARBOARD_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the starboard.");
		}

		const ownerId = interaction.user.id;
		const current = await readStarboardSettings(guild);

		if (interaction.isButton() && context.action === "threshold") {
			await interaction.showModal(
				modalForm({
					id: STARBOARD_SETTINGS_ID,
					action: "save-threshold",
					args: [ownerId],
					title: "Stars needed",
					fields: [
						{
							id: "threshold",
							label: `Stars needed (${String(STARBOARD_LIMITS.minThreshold)} to ${String(STARBOARD_LIMITS.maxThreshold)})`,
							value: String(current.threshold),
							maxLength: 2,
						},
					],
				}),
			);
			return;
		}

		let settings;
		let note: string;

		if (interaction.isModalSubmit() && context.action === "save-threshold") {
			const threshold = parseThreshold(interaction.fields.getTextInputValue("threshold"));
			settings = await applyStarboardSettings(guild, { threshold }, ownerId);
			note = `A message now needs ${String(threshold)} ⭐.`;
		} else if (interaction.isChannelSelectMenu() && context.action === "channel") {
			const channelId = await pickedChannelId(interaction, guild);
			if (channelId === null) return;
			settings = await applyStarboardSettings(guild, { channelId }, ownerId);
			note = `Starred messages will be reposted in <#${channelId}>.`;
		} else if (interaction.isButton() && context.action === "self") {
			settings = await applyStarboardSettings(guild, { selfStar: !current.selfStar }, ownerId);
			note = settings.selfStar ? "The author's own star counts." : "The author's own star no longer counts.";
		} else if (interaction.isButton() && context.action === "toggle") {
			settings = await applyStarboardSettings(guild, { enabled: !current.enabled }, ownerId);
			note = settings.enabled ? "The starboard is on." : "The starboard is off.";
		} else {
			return;
		}

		const panel = starboardSettingsPanel(settings, ownerId, note);
		if (interaction.isModalSubmit() && !interaction.isFromMessage()) return;
		await interaction.update(panel);
	},
});
