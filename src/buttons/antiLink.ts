import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { disableAntiLink, getAntiLink, setAntiLink } from "@database/repositories/settingsRepository";
import {
	ANTILINK_PANEL_ID,
	type AntiLinkPanelState,
	antiLinkPanel,
	DEFAULT_BYPASS,
	isBypassPermission,
} from "@lib/antiLinkPanel.util";
import { humanisePermission } from "@lib/format.util";

/** Every control on the link-removal panel. */
export async function antiLinkState(guildId: string): Promise<AntiLinkPanelState> {
	const settings = await getAntiLink(guildId);
	const stored = settings?.bypassPermission ?? "";

	return {
		enabled: settings !== null,
		// A permission stored before the list was fixed could be anything, and an
		// unknown one would silently let nobody bypass.
		bypass: isBypassPermission(stored) ? stored : DEFAULT_BYPASS,
	};
}

export default defineButton({
	id: ANTILINK_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change link removal.");
		}

		const guildId = interaction.guild.id;
		const ownerId = interaction.user.id;
		const state = await antiLinkState(guildId);

		const show = async (next: AntiLinkPanelState, note?: string): Promise<void> => {
			await interaction.update(antiLinkPanel({ ...next, ...(note !== undefined ? { note } : {}) }, ownerId));
		};

		switch (context.action) {
			case "toggle": {
				if (state.enabled) {
					await disableAntiLink(guildId);
					await show({ ...state, enabled: false }, "Links are allowed again.");
					return;
				}

				await setAntiLink(guildId, state.bypass);
				await show({ ...state, enabled: true }, "Links will be removed from now on.");
				return;
			}

			case "bypass": {
				if (!interaction.isStringSelectMenu()) return;
				if (!state.enabled) return;

				const [chosen] = interaction.values;
				if (chosen === undefined || !isBypassPermission(chosen)) return;

				await setAntiLink(guildId, chosen);
				await show({ ...state, bypass: chosen }, `${humanisePermission(chosen)} may still post links.`);
				return;
			}

			default:
				return;
		}
	},
});
