import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { applyBirthdaySettings, BIRTHDAY_PANEL_ID, birthdaySettingsPanel, readBirthdayOverview } from "@lib/birthdays";
import { modalForm, pickedChannelId } from "@lib/discord";
import { BIRTHDAY_LIMITS, sanitiseText } from "@testify/shared";

/** The controls on `/birthday settings`, each applied the moment it is pressed. */
export default defineButton({
	id: BIRTHDAY_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change birthday posts.");
		}

		const ownerId = interaction.user.id;
		const current = await readBirthdayOverview(guild);

		if (interaction.isButton() && context.action === "edit") {
			await interaction.showModal(
				modalForm({
					id: BIRTHDAY_PANEL_ID,
					action: "save-message",
					args: [ownerId],
					title: "Birthday message",
					fields: [
						{
							id: "message",
							label: "The message",
							value: current.message,
							paragraph: true,
							maxLength: BIRTHDAY_LIMITS.maxMessage,
						},
					],
				}),
			);
			return;
		}

		let note: string;
		if (interaction.isModalSubmit() && context.action === "save-message") {
			const message = sanitiseText(interaction.fields.getTextInputValue("message"));
			if (message === "") throw new UserFacingError("Write something for the birthday post to say.");
			await applyBirthdaySettings(guild, { message }, ownerId);
			note = "The birthday message is saved.";
		} else if (interaction.isChannelSelectMenu() && context.action === "channel") {
			const channelId = await pickedChannelId(interaction, guild);
			if (channelId === null) return;
			await applyBirthdaySettings(guild, { channelId }, ownerId);
			note = `Birthdays will be posted in <#${channelId}>.`;
		} else if (interaction.isButton() && context.action === "toggle") {
			const saved = await applyBirthdaySettings(guild, { enabled: !current.enabled }, ownerId);
			note = saved.enabled ? "Birthday posts are on." : "Birthday posts are off.";
		} else {
			return;
		}

		if (interaction.isModalSubmit() && !interaction.isFromMessage()) return;
		const overview = await readBirthdayOverview(guild);
		await interaction.update(birthdaySettingsPanel(overview, overview.shared, ownerId, note));
	},
});
