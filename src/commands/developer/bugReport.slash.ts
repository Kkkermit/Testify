import { MessageFlags, WebhookClient } from "discord.js";
import { defineCommand } from "@core/command";
import { SetupError } from "@core/errors";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "bug-report",
	description: "Reports a bug to the developers.",
	category: "developer",
	cooldown: 60_000,
	options: [
		{ name: "summary", description: "What went wrong.", type: "string", required: true, maxLength: 200 },
		{ name: "details", description: "Steps to reproduce it.", type: "string", required: true, maxLength: 1_500 },
	],

	async run(interaction, client) {
		const url = client.env.CHANNEL_FEEDBACK_LOG;
		if (url === undefined) throw new SetupError("Bug reporting is not configured on this instance.");

		const webhook = new WebhookClient({ url });
		try {
			await webhook.send({
				embeds: [
					embed({
						category: "developer",
						title: "Bug report",
						description: interaction.options.getString("summary", true),
						fields: [
							{ name: "Details", value: interaction.options.getString("details", true) },
							{ name: "Reported by", value: `${interaction.user.username} (\`${interaction.user.id}\`)`, inline: true },
							{ name: "Server", value: interaction.guild?.name ?? "Direct message", inline: true },
						],
					}),
				],
			});
		} finally {
			webhook.destroy();
		}

		await reply(interaction, {
			embeds: [successEmbed("Thanks. Your report has been sent.")],
			flags: MessageFlags.Ephemeral,
		});
	},
});
