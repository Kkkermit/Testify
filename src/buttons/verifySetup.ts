import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { deleteVerifyConfig, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { pickedChannelId } from "@lib/channelPick.util";
import { modalForm } from "@lib/components.util";
import { publishVerifyPanel, roleTooHigh } from "@lib/verifyActions.util";
import { isReady, normaliseVerify, type VerifyConfig, verifyPanel, VERIFY_PANEL_ID } from "@lib/verifyPanel.util";

/** Every control on the verification setup panel. */
async function currentConfig(guildId: string): Promise<VerifyConfig> {
	return normaliseVerify(await getVerifyConfig(guildId));
}

export default defineButton({
	id: VERIFY_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change verification.");
		}

		const guild = interaction.guild;
		const ownerId = interaction.user.id;
		const config = await currentConfig(guild.id);

		const show = async (next: VerifyConfig, note?: string): Promise<void> => {
			const state = {
				config: next,
				roleTooHigh: roleTooHigh(guild, next.roleId),
				...(note !== undefined ? { note } : {}),
			};

			if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
				await interaction.reply(verifyPanel(state, ownerId));
				return;
			}

			await interaction.update(verifyPanel(state, ownerId));
		};

		switch (context.action) {
			case "channel": {
				const channelId = await pickedChannelId(interaction, guild);
				if (channelId === null) return;

				const messageId = channelId === config.channelId ? config.messageId : null;
				await saveVerifyConfig(guild.id, { channelId, messageId, message: config.message });
				await show({ ...config, channelId, messageId });
				return;
			}

			case "role": {
				if (!interaction.isRoleSelectMenu()) return;

				const [roleId] = interaction.values;
				if (roleId === undefined) return;

				await saveVerifyConfig(guild.id, { roleId, message: config.message });
				await show({ ...config, roleId });
				return;
			}

			case "edit": {
				if (!interaction.isMessageComponent()) return;

				await interaction.showModal(
					modalForm({
						id: VERIFY_PANEL_ID,
						action: "save-message",
						args: [ownerId],
						title: "What the panel says",
						fields: [{ id: "message", label: "Shown above the Verify button", paragraph: true, value: config.message }],
					}),
				);
				return;
			}

			case "save-message": {
				if (!interaction.isModalSubmit()) return;

				const message = interaction.fields.getTextInputValue("message").trim();
				if (message.length === 0) throw new UserFacingError("The panel needs something to say.");

				await saveVerifyConfig(guild.id, { message });
				const next = { ...config, message };

				if (next.messageId !== null && isReady(next)) await publishVerifyPanel(guild, next);
				await show(next, "Wording updated.");
				return;
			}

			case "post": {
				if (!isReady(config)) throw new UserFacingError("Pick a channel and a role first.");

				const messageId = await publishVerifyPanel(guild, config);
				await saveVerifyConfig(guild.id, { messageId });
				await show({ ...config, messageId }, "Panel posted. Members can verify now.");
				return;
			}

			case "off": {
				await deleteVerifyConfig(guild.id);
				await show(await currentConfig(guild.id), "Verification is off. The posted panel no longer works.");
				return;
			}

			default:
				return;
		}
	},
});
