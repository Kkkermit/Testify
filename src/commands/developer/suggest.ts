import { MessageFlags, WebhookClient } from "discord.js";
import { strings } from "../../config/strings";
import { defineCommand } from "../../core/command";
import { SetupError, UserFacingError } from "../../core/errors";
import { containsProfanity } from "../../lib/contentFilter";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "suggest",
	description: "Sends a suggestion to the developers.",
	category: "developer",
	cooldown: 60_000,
	options: [{ name: "suggestion", description: "Your idea.", type: "string", required: true, maxLength: 1_500 }],

	async run(interaction, client) {
		const url = client.env.CHANNEL_FEEDBACK_LOG;
		if (url === undefined) throw new SetupError("Suggestions are not configured on this instance.");

		const suggestion = interaction.options.getString("suggestion", true);
		if (containsProfanity(suggestion)) throw new UserFacingError(strings.generic.profanity);

		const webhook = new WebhookClient({ url });
		try {
			await webhook.send({
				embeds: [
					embed({
						category: "developer",
						title: "Suggestion",
						description: suggestion,
						fields: [
							{
								name: "Suggested by",
								value: `${interaction.user.username} (\`${interaction.user.id}\`)`,
								inline: true,
							},
							{ name: "Server", value: interaction.guild?.name ?? "Direct message", inline: true },
						],
					}),
				],
			});
		} finally {
			webhook.destroy();
		}

		await reply(interaction, {
			embeds: [successEmbed("Thanks. Your suggestion has been sent.")],
			flags: MessageFlags.Ephemeral,
		});
	},
});
