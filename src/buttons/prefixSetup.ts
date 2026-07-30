import { PermissionFlagsBits } from "discord.js";
import { DEFAULT_PREFIX } from "@config/constants";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getPrefixConfig, setPrefix, setPrefixEnabled } from "@database/repositories/settingsRepository";
import { modalForm } from "@lib/components.util";
import { checkPrefix, PREFIX_LIMITS, PREFIX_PANEL_ID, prefixPanel, type PrefixPanelState } from "@lib/prefixPanel.util";

/** Every control on the prefix panel. */
export async function prefixState(guildId: string): Promise<PrefixPanelState> {
	return getPrefixConfig(guildId);
}

export default defineButton({
	id: PREFIX_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the prefix.");
		}

		const guildId = interaction.guild.id;
		const ownerId = interaction.user.id;
		const state = await prefixState(guildId);

		const show = async (next: PrefixPanelState, note?: string): Promise<void> => {
			const payload = prefixPanel({ ...next, ...(note !== undefined ? { note } : {}) }, ownerId);

			if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
				await interaction.reply(payload);
				return;
			}

			await interaction.update(payload);
		};

		switch (context.action) {
			case "edit": {
				if (!interaction.isMessageComponent()) return;

				await interaction.showModal(
					modalForm({
						id: PREFIX_PANEL_ID,
						action: "save",
						args: [ownerId],
						title: "Text command prefix",
						fields: [
							{
								id: "prefix",
								label: `Up to ${PREFIX_LIMITS.maxLength} characters, no spaces`,
								value: state.prefix,
								maxLength: PREFIX_LIMITS.maxLength,
							},
						],
					}),
				);
				return;
			}

			case "save": {
				if (!interaction.isModalSubmit()) return;

				const parsed = checkPrefix(interaction.fields.getTextInputValue("prefix"));
				if (!parsed.ok) throw new UserFacingError(parsed.reason);

				await setPrefix(guildId, parsed.value);
				await show({ ...state, prefix: parsed.value }, `Commands now start with \`${parsed.value}\`.`);
				return;
			}

			case "toggle": {
				const isEnabled = !state.isEnabled;

				await setPrefixEnabled(guildId, isEnabled);
				await show({ ...state, isEnabled }, isEnabled ? undefined : "Only slash commands work now.");
				return;
			}

			case "reset": {
				await setPrefix(guildId, DEFAULT_PREFIX);
				await show({ ...state, prefix: DEFAULT_PREFIX }, `Back to \`${DEFAULT_PREFIX}\`.`);
				return;
			}

			default:
				return;
		}
	},
});
