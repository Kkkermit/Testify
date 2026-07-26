import { WebhookClient } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { ConfigurationError } from "../../../core/errors";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "bug-report",
	description: "Reports a bug to the developers.",
	category: Category.Developer,
	surfaces: ["slash"],
	cooldownMs: 60_000,
	options: [
		{ name: "summary", description: "What went wrong.", type: "string", required: true, maxLength: 200 },
		{ name: "details", description: "Steps to reproduce it.", type: "string", required: true, maxLength: 1_500 },
	],

	async execute(ctx) {
		const url = ctx.client.env.WEBHOOK_BUG_REPORTS;
		if (url === undefined) throw new ConfigurationError("Bug reporting is not configured on this instance.");

		const webhook = new WebhookClient({ url });
		try {
			await webhook.send({
				embeds: [
					embed({
						category: Category.Developer,
						title: "Bug report",
						description: ctx.options.getString("summary", true),
						fields: [
							{ name: "Details", value: ctx.options.getString("details", true) },
							{ name: "Reported by", value: `${ctx.user.username} (\`${ctx.user.id}\`)`, inline: true },
							{ name: "Server", value: ctx.guild?.name ?? "Direct message", inline: true },
						],
					}),
				],
			});
		} finally {
			webhook.destroy();
		}

		await ctx.reply({ embeds: [successEmbed("Thanks. Your report has been sent.")], ephemeral: true });
	},
});
