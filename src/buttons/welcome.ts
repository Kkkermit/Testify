import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { disableWelcome, getWelcome, saveWelcome } from "@database/repositories/settingsRepository";
import { modalForm } from "@lib/components.util";
import {
	DEFAULT_WELCOME_MESSAGE,
	isWelcomeStyle,
	normaliseWelcome,
	WELCOME_LIMITS,
	type WelcomeConfig,
} from "@lib/welcome.util";
import { greetingFor } from "@lib/welcomeActions.util";
import { welcomePanel, WELCOME_PANEL_ID } from "@lib/welcomePanel.util";

/** Every control on the welcome panel. */
async function currentConfig(guildId: string): Promise<WelcomeConfig | null> {
	return normaliseWelcome(await getWelcome(guildId));
}

export default defineButton({
	id: WELCOME_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the welcome messages.");
		}

		const guild = interaction.guild;
		const ownerId = interaction.user.id;
		const config = await currentConfig(guild.id);

		const show = async (next: WelcomeConfig | null, note?: string): Promise<void> => {
			const payload = welcomePanel({ config: next, ...(note !== undefined ? { note } : {}) }, ownerId);

			if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
				await interaction.reply(payload);
				return;
			}

			await interaction.update(payload);
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

				const saved = await saveWelcome(guild.id, {
					channelId,
					...(config === null ? { message: DEFAULT_WELCOME_MESSAGE, style: "card" as const } : {}),
				});

				await show(normaliseWelcome(saved), config === null ? "Set up. Press Preview to see it." : undefined);
				return;
			}

			case "style": {
				if (config === null) return;

				const [style] = context.args;
				if (style === undefined || !isWelcomeStyle(style)) return;

				await saveWelcome(guild.id, { style });
				await show({ ...config, style });
				return;
			}

			case "edit": {
				if (!interaction.isMessageComponent()) return;
				if (config === null) throw new UserFacingError("Pick a channel first.");

				await interaction.showModal(
					modalForm({
						id: WELCOME_PANEL_ID,
						action: "save-message",
						args: [ownerId],
						title: "The welcome message",
						fields: [
							{
								id: "message",
								label: "Use {user}, {server} and {count}",
								paragraph: true,
								value: config.message,
								maxLength: WELCOME_LIMITS.maxMessage,
							},
						],
					}),
				);
				return;
			}

			case "save-message": {
				if (!interaction.isModalSubmit()) return;
				if (config === null) return;

				const message = interaction.fields.getTextInputValue("message").trim();
				if (message.length === 0) throw new UserFacingError("The greeting cannot be empty.");

				await saveWelcome(guild.id, { message });
				await show({ ...config, message }, "Message updated.");
				return;
			}

			case "preview": {
				if (config === null) return;
				if (interaction.member === null) return;

				const member = await guild.members.fetch(ownerId).catch(() => null);
				if (member === null) throw new UserFacingError("I could not read your member profile to build a preview.");

				const greeting = await greetingFor(member, config, await getWelcome(guild.id));
				await interaction.reply({ ...greeting, flags: MessageFlags.Ephemeral });
				return;
			}

			case "clear-bg": {
				if (config === null) return;

				await saveWelcome(guild.id, { background: null });
				await show({ ...config, hasBackground: false }, "Background removed. The card uses the default again.");
				return;
			}

			case "off": {
				await disableWelcome(guild.id);
				await show(null, "Nobody will be greeted from now on.");
				return;
			}

			default:
				return;
		}
	},
});
