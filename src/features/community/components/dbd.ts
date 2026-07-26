import { ButtonStyle } from "discord.js";
import { defineComponent } from "../../../core/component";
import { encodeId, Namespace } from "../../../core/customId";
import { button, row } from "../../../ui/components";
import { buildEmbed } from "../commands/dbd";

export default defineComponent({
	namespace: Namespace.Dbd,
	ownerOnly: true,

	async handle(ctx) {
		if (!ctx.interaction.isButton() || ctx.action !== "reroll") return;

		const [rawRole = "survivor", ownerId = ctx.interaction.user.id] = ctx.args;
		const role = rawRole === "killer" ? "killer" : "survivor";

		await ctx.interaction.update({
			embeds: [buildEmbed(role)],
			components: [
				row(
					button({
						id: encodeId(Namespace.Dbd, "reroll", role, ownerId),
						label: "Reroll",
						style: ButtonStyle.Primary,
					}),
				),
			],
		});
	},
});
