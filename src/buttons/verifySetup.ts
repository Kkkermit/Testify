import { ButtonStyle, type Guild, PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { customId, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { deleteVerifyConfig, getVerifyConfig, saveVerifyConfig } from "@database/repositories/verificationRepository";
import { button, modalForm, row } from "@lib/components.util";
import { embed } from "@lib/embeds.util";
import { isReady, normaliseVerify, type VerifyConfig, verifyPanel, VERIFY_PANEL_ID } from "@lib/verifyPanel.util";

/** Every control on the verification setup panel. */
async function currentConfig(guildId: string): Promise<VerifyConfig> {
	return normaliseVerify(await getVerifyConfig(guildId));
}

/** Discord refuses a role at or above the bot's own, and says nothing until it does. */
function roleTooHigh(guild: Guild, roleId: string | null): boolean {
	if (roleId === null) return false;

	const role = guild.roles.cache.get(roleId);
	const me = guild.members.me;
	if (!role || me === null) return false;

	return role.managed || role.position >= me.roles.highest.position;
}

/** Posts the public panel, or edits the one already there. */
async function publish(guild: Guild, config: VerifyConfig): Promise<string> {
	if (config.channelId === null) throw new UserFacingError("Pick a channel first.");

	const channel = await guild.channels.fetch(config.channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("I cannot post in that channel any more. Pick another one.");
	}

	const payload = {
		embeds: [
			embed({
				category: "settings",
				title: `${theme.emoji.verify} Verification`,
				description: config.message,
				...(guild.iconURL() !== null ? { thumbnail: guild.iconURL()! } : {}),
			}),
		],
		components: [
			row(
				button({
					id: customId("verify", "start"),
					label: "Verify",
					emoji: theme.emoji.verify,
					style: ButtonStyle.Success,
				}),
			),
		],
	};

	if (config.messageId !== null) {
		const existing = await channel.messages.fetch(config.messageId).catch(() => null);
		if (existing !== null) {
			await existing.edit(payload);
			return existing.id;
		}
	}

	return (await channel.send(payload)).id;
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
				if (!interaction.isChannelSelectMenu()) return;

				const [channelId] = interaction.values;
				if (channelId === undefined) return;

				const channel = await guild.channels.fetch(channelId).catch(() => null);
				if (channel?.isSendable() !== true) {
					throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
				}

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

				if (next.messageId !== null && isReady(next)) await publish(guild, next);
				await show(next, "Wording updated.");
				return;
			}

			case "post": {
				if (!isReady(config)) throw new UserFacingError("Pick a channel and a role first.");

				const messageId = await publish(guild, config);
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
