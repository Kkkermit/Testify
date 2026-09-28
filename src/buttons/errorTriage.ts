import { EmbedBuilder } from "discord.js";
import { theme } from "@config/theme";
import { defineButton } from "@core/button";
import { ERROR_TRIAGE_ID, isTriageState, triageRow } from "@lib/bot";

const COLOURS = {
	pending: theme.colours.warning,
	solved: theme.colours.success,
	unsolved: theme.colours.error,
} as const;

/** Recolours the error report in place. */
export default defineButton({
	id: ERROR_TRIAGE_ID,

	async run(interaction, context) {
		if (!interaction.isButton() || !isTriageState(context.action)) return;

		const original = interaction.message.embeds[0];
		if (!original) return;

		const updated = EmbedBuilder.from(original)
			.setColor(COLOURS[context.action])
			.setFooter({ text: `Marked as ${context.action} by ${interaction.user.username}` });

		await interaction.update({ embeds: [updated], components: [triageRow(context.action)] });
	},
});
