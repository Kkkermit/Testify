import { MessageFlags } from "discord.js";
import { DEFAULT_PREFIX } from "@config/constants";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getPrefix } from "@database/repositories/settingsRepository";
import { dashboardUrl } from "@lib/bot";
import { reply } from "@lib/discord";
import { supportContext, supportDesk, supportScreen } from "@lib/support";
import { SUPPORT_LIMITS, supportQuestion } from "@testify/shared";

export default defineCommand({
	name: "ask",
	description: "Answers questions about the bot, its dashboard, and setting it up.",
	category: "info",
	aliases: ["support", "faq"],
	cooldown: 5_000,
	options: [
		{
			name: "question",
			description: "What you want to know.",
			type: "string",
			required: true,
			maxLength: SUPPORT_LIMITS.questionMax,
		},
	],

	async run(interaction, client) {
		const parsed = supportQuestion.safeParse({ question: interaction.options.getString("question", true) });
		if (!parsed.success) {
			throw new UserFacingError(
				`Ask in ${String(SUPPORT_LIMITS.questionMin)} to ${String(SUPPORT_LIMITS.questionMax)} characters of plain text.`,
			);
		}

		// Matching can call out to a model, which may take longer than Discord waits for a first reply.
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const prefix = interaction.guild === null ? DEFAULT_PREFIX : await getPrefix(interaction.guild.id);
		const help = supportContext(client, prefix);
		const answer = await supportDesk(client).ask(parsed.data.question, help);

		await reply(
			interaction,
			supportScreen(answer, { bot: help.bot, ownerId: interaction.user.id, dashboard: dashboardUrl(client.env) }),
		);
	},
});
