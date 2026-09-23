import { DEFAULT_PREFIX } from "@config/constants";
import { theme } from "@config/theme";
import { defineButton } from "@core/button";
import { getPrefix } from "@database/repositories/settingsRepository";
import { dashboardUrl } from "@lib/bot";
import { SUPPORT_PANEL_ID, supportContext, supportDesk, supportScreen } from "@lib/support";

/** Opening one of the related articles under an answer from `/ask`. */
export default defineButton({
	id: SUPPORT_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton() || context.action !== "open") return;

		const [articleId = ""] = context.args;
		const prefix = interaction.guild === null ? DEFAULT_PREFIX : await getPrefix(interaction.guild.id);
		const help = supportContext(context.client, prefix);
		const desk = supportDesk(context.client);

		await interaction.update(
			supportScreen(
				{ answer: desk.article(articleId, help), related: desk.relatedTo(articleId, help) },
				{
					bot: help.bot,
					ownerId: interaction.user.id,
					dashboard: dashboardUrl(context.client.env),
					supportServer: theme.supportServer,
				},
			),
		);
	},
});
