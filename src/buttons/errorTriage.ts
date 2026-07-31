import { ButtonStyle, EmbedBuilder } from "discord.js";
import { customId, defineButton } from "@core/button";
import { button, row } from "@lib/components.util";

const COLORS = { pending: 0xfee75c, solved: 0x57f287, unsolved: 0xed4245 } as const;
const LABELS = { pending: "Pending", solved: "Solved", unsolved: "Unsolved" } as const;

type TriageState = keyof typeof COLORS;

function isTriageState(value: string): value is TriageState {
	return value === "pending" || value === "solved" || value === "unsolved";
}

/** Recolours the error report in place. */
export default defineButton({
	id: "error",

	async run(interaction, context) {
		if (!interaction.isButton() || !isTriageState(context.action)) return;

		const original = interaction.message.embeds[0];
		if (!original) return;

		const updated = EmbedBuilder.from(original)
			.setColor(COLORS[context.action])
			.setFooter({ text: `Marked as ${LABELS[context.action].toLowerCase()} by ${interaction.user.username}` });

		await interaction.update({
			embeds: [updated],
			components: [
				row(
					button({
						id: customId("error", "pending"),
						label: "Mark as pending",
						style: ButtonStyle.Primary,
						disabled: context.action === "pending",
					}),
					button({
						id: customId("error", "solved"),
						label: "Mark as solved",
						style: ButtonStyle.Success,
						disabled: context.action === "solved",
					}),
					button({
						id: customId("error", "unsolved"),
						label: "Mark as unsolved",
						style: ButtonStyle.Danger,
						disabled: context.action === "unsolved",
					}),
				),
			],
		});
	},
});
