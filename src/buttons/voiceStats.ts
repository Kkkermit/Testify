import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getVoiceCounter, setVoiceCounter } from "@database/repositories/settingsRepository";
import { syncVoiceCounters } from "@lib/voiceCounters.util";
import { VOICESTATS_PANEL_ID, type VoiceStatsPanelState, voiceStatsPanel } from "@lib/voiceStatsPanel.util";

/** Every control on the voice-counter panel. */
export async function voiceStatsState(guildId: string): Promise<VoiceStatsPanelState> {
	const settings = await getVoiceCounter(guildId);

	return { memberChannelId: settings?.memberChannelId ?? null, botChannelId: settings?.botChannelId ?? null };
}

export default defineButton({
	id: VOICESTATS_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change the voice counters.");
		}

		const guild = interaction.guild;
		const ownerId = interaction.user.id;
		const state = await voiceStatsState(guild.id);

		const save = async (next: VoiceStatsPanelState, note?: string): Promise<void> => {
			await setVoiceCounter(guild.id, { memberChannelId: next.memberChannelId, botChannelId: next.botChannelId });
			await interaction.update(voiceStatsPanel({ ...next, ...(note !== undefined ? { note } : {}) }, ownerId));

			// Written first, then applied, so the names match what the panel now says.
			await syncVoiceCounters(context.client, guild);
		};

		switch (context.action) {
			case "members": {
				if (!interaction.isChannelSelectMenu()) return;
				await save({ ...state, memberChannelId: interaction.values[0] ?? null });
				return;
			}

			case "bots": {
				if (!interaction.isChannelSelectMenu()) return;
				await save({ ...state, botChannelId: interaction.values[0] ?? null });
				return;
			}

			case "refresh": {
				await interaction.update(voiceStatsPanel({ ...state, note: "Counts updated." }, ownerId));
				await syncVoiceCounters(context.client, guild);
				return;
			}

			case "off": {
				await save(
					{ memberChannelId: null, botChannelId: null },
					"Counters removed. The channel names stay as they are.",
				);
				return;
			}

			default:
				return;
		}
	},
});
