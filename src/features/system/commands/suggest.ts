import { WebhookClient } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { ConfigurationError, UserFacingError } from "../../../core/errors";
import { containsProfanity } from "../../../core/contentFilter";
import { strings } from "../../../config/strings";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "suggest",
	description: "Sends a suggestion to the developers.",
	category: Category.Developer,
	surfaces: ["slash"],
	cooldownMs: 60_000,
	options: [{ name: "suggestion", description: "Your idea.", type: "string", required: true, maxLength: 1_500 }],

	async execute(ctx) {
		const url = ctx.client.env.WEBHOOK_SUGGESTIONS;
		if (url === undefined) throw new ConfigurationError("Suggestions are not configured on this instance.");

		const suggestion = ctx.options.getString("suggestion", true);
		if (containsProfanity(suggestion)) throw new UserFacingError(strings.generic.profanity);

		const webhook = new WebhookClient({ url });
		try {
			await webhook.send({
				embeds: [
					embed({
						category: Category.Developer,
						title: "Suggestion",
						description: suggestion,
						fields: [
							{ name: "Suggested by", value: `${ctx.user.username} (\`${ctx.user.id}\`)`, inline: true },
							{ name: "Server", value: ctx.guild?.name ?? "Direct message", inline: true },
						],
					}),
				],
			});
		} finally {
			webhook.destroy();
		}

		await ctx.reply({ embeds: [successEmbed("Thanks. Your suggestion has been sent.")], ephemeral: true });
	},
});
