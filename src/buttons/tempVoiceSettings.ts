import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { modalForm } from "@lib/discord";
import {
	applyTempVoiceSettings,
	makeLobby,
	parseNameTemplate,
	parseUserLimit,
	readTempVoiceSettings,
	TEMP_VOICE_SETTINGS_ID,
	tempVoiceSettingsPanel,
} from "@lib/tempVoice";
import { TEMP_VOICE_LIMITS, type TempVoiceSettings } from "@testify/shared";

/** The controls on `/temp-voice`, each applied the moment it is pressed. */
export default defineButton({
	id: TEMP_VOICE_SETTINGS_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change join-to-create channels.");
		}

		const ownerId = interaction.user.id;
		const current = await readTempVoiceSettings(guild);

		if (interaction.isButton() && (context.action === "name" || context.action === "limit")) {
			const naming = context.action === "name";
			await interaction.showModal(
				modalForm({
					id: TEMP_VOICE_SETTINGS_ID,
					action: naming ? "save-name" : "save-limit",
					args: [ownerId],
					title: naming ? "Name for new channels" : "People per channel",
					fields: [
						naming
							? {
									id: "value",
									label: "Name, with {user} for theirs",
									value: current.nameTemplate,
									maxLength: TEMP_VOICE_LIMITS.maxTemplate,
								}
							: {
									id: "value",
									label: `People per channel (0 for no limit)`,
									value: String(current.userLimit),
									maxLength: 2,
								},
					],
				}),
			);
			return;
		}

		let settings: TempVoiceSettings;
		let note: string;

		if (interaction.isModalSubmit() && context.action === "save-name") {
			const nameTemplate = parseNameTemplate(interaction.fields.getTextInputValue("value"));
			settings = await applyTempVoiceSettings(guild, { nameTemplate }, ownerId);
			note = "New channels will use that name.";
		} else if (interaction.isModalSubmit() && context.action === "save-limit") {
			const userLimit = parseUserLimit(interaction.fields.getTextInputValue("value"));
			settings = await applyTempVoiceSettings(guild, { userLimit }, ownerId);
			note = userLimit === 0 ? "New channels have no limit." : `New channels hold ${String(userLimit)}.`;
		} else if (interaction.isChannelSelectMenu() && context.action === "lobby") {
			const [lobbyChannelId = null] = interaction.values;
			if (lobbyChannelId === null) return;
			settings = await applyTempVoiceSettings(guild, { lobbyChannelId }, ownerId);
			note = `Joining <#${lobbyChannelId}> will make a channel.`;
		} else if (interaction.isChannelSelectMenu() && context.action === "category") {
			const [categoryId = null] = interaction.values;
			settings = await applyTempVoiceSettings(guild, { categoryId }, ownerId);
			note = categoryId === null ? "New channels go beside the lobby." : `New channels go in <#${categoryId}>.`;
		} else if (interaction.isButton() && context.action === "make-lobby") {
			settings = await makeLobby(guild, ownerId);
			note = `Made <#${settings.lobbyChannelId ?? ""}>. Turn it on when you are ready.`;
		} else if (interaction.isButton() && context.action === "toggle") {
			settings = await applyTempVoiceSettings(guild, { enabled: !current.enabled }, ownerId);
			note = settings.enabled ? "Join to create is on." : "Join to create is off.";
		} else {
			return;
		}

		if (interaction.isModalSubmit() && !interaction.isFromMessage()) return;
		await interaction.update(tempVoiceSettingsPanel(settings, ownerId, note));
	},
});
