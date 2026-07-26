import { ButtonStyle, EmbedBuilder } from "discord.js";
import { defineComponent } from "../../../core/component";
import { Namespace } from "../../../core/customId";
import { button, row } from "../../../ui/components";

const COLORS = { pending: 0xfee75c, solved: 0x57f287, unsolved: 0xed4245 } as const;
const LABELS = { pending: "Pending", solved: "Solved", unsolved: "Unsolved" } as const;

type TriageState = keyof typeof COLORS;

function isTriageState(value: string): value is TriageState {
	return value === "pending" || value === "solved" || value === "unsolved";
}

/**
 * Recolours the error report in place. The previous implementation stored the
 * message, embed and row in three single global slots on the client, so two
 * concurrent errors made the button edit the wrong report.
 */
export default defineComponent({
	namespace: Namespace.ErrorTriage,

	async handle(ctx) {
		if (!ctx.interaction.isButton() || !isTriageState(ctx.action)) return;

		const original = ctx.interaction.message.embeds[0];
		if (!original) return;

		const updated = EmbedBuilder.from(original)
			.setColor(COLORS[ctx.action])
			.setFooter({ text: `Marked as ${LABELS[ctx.action].toLowerCase()} by ${ctx.interaction.user.username}` });

		await ctx.interaction.update({
			embeds: [updated],
			components: [
				row(
					button({
						id: `${Namespace.ErrorTriage}:pending`,
						label: "Mark as pending",
						style: ButtonStyle.Primary,
						disabled: ctx.action === "pending",
					}),
					button({
						id: `${Namespace.ErrorTriage}:solved`,
						label: "Mark as solved",
						style: ButtonStyle.Success,
						disabled: ctx.action === "solved",
					}),
					button({
						id: `${Namespace.ErrorTriage}:unsolved`,
						label: "Mark as unsolved",
						style: ButtonStyle.Danger,
						disabled: ctx.action === "unsolved",
					}),
				),
			],
		});
	},
});
