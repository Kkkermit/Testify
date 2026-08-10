import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { disableCounting, getCounting, resetCount, setCounting } from "@database/repositories/settingsRepository";
import { pickedChannelId } from "@lib/channelPick.util";
import { modalForm } from "@lib/components.util";
import { COUNTING_LIMITS, COUNTING_PANEL_ID, countingPanel, type CountingPanelState } from "@lib/countingPanel.util";
import { formatNumber } from "@lib/format.util";
import { parseWholeNumber } from "@lib/settingsPanel.util";

/** Every control on the counting panel. */
export async function countingState(guildId: string): Promise<CountingPanelState> {
	const settings = await getCounting(guildId);

	return {
		channelId: settings?.channelId ?? null,
		count: settings?.count ?? 0,
		goal: settings?.maxCount ?? COUNTING_LIMITS.maxGoal,
	};
}

export default defineButton({
	id: COUNTING_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change counting.");
		}

		const guild = interaction.guild;
		const ownerId = interaction.user.id;
		const state = await countingState(guild.id);

		const show = async (next: CountingPanelState, note?: string): Promise<void> => {
			const payload = countingPanel({ ...next, ...(note !== undefined ? { note } : {}) }, ownerId);

			if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
				await interaction.reply(payload);
				return;
			}

			await interaction.update(payload);
		};

		switch (context.action) {
			case "channel": {
				const channelId = await pickedChannelId(interaction, guild);
				if (channelId === null) return;

				await setCounting(guild.id, channelId, state.goal);
				await show({ ...state, channelId }, state.channelId === null ? "Counting starts at **1**." : undefined);
				return;
			}

			case "reset": {
				if (state.channelId === null) return;

				await resetCount(guild.id);
				await show({ ...state, count: 0 }, "Back to **1**.");
				return;
			}

			case "goal": {
				if (!interaction.isMessageComponent()) return;
				if (state.channelId === null) return;

				await interaction.showModal(
					modalForm({
						id: COUNTING_PANEL_ID,
						action: "save-goal",
						args: [ownerId],
						title: "Counting goal",
						fields: [
							{
								id: "goal",
								label: `Between ${COUNTING_LIMITS.minGoal} and ${COUNTING_LIMITS.maxGoal}`,
								value: String(state.goal),
							},
						],
					}),
				);
				return;
			}

			case "save-goal": {
				if (!interaction.isModalSubmit()) return;
				if (state.channelId === null) return;

				const parsed = parseWholeNumber(interaction.fields.getTextInputValue("goal"), "Goal", {
					min: COUNTING_LIMITS.minGoal,
					max: COUNTING_LIMITS.maxGoal,
				});
				if (!parsed.ok) throw new UserFacingError(parsed.reason);

				await setCounting(guild.id, state.channelId, parsed.value);
				await show({ ...state, goal: parsed.value }, `Counting up to **${formatNumber(parsed.value)}**.`);
				return;
			}

			case "off": {
				await disableCounting(guild.id);
				await show({ channelId: null, count: 0, goal: COUNTING_LIMITS.maxGoal }, "Counting is off.");
				return;
			}

			default:
				return;
		}
	},
});
