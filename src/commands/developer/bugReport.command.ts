import { defineCommand } from "@core/command";
import { SetupError } from "@core/errors";
import { postToLogChannel } from "@lib/bot";
import { embed, reply, successEmbed } from "@lib/discord";

export default defineCommand({
	name: "bug-report",
	description: "Reports a bug to the developers.",
	category: "developer",
	private: true,
	cooldown: 60_000,
	options: [
		{ name: "summary", description: "What went wrong.", type: "string", required: true, maxLength: 200 },
		{ name: "details", description: "Steps to reproduce it.", type: "string", required: true, maxLength: 1_500 },
	],

	async run(interaction, client) {
		const channelId = client.env.CHANNEL_BUG_REPORT_LOG;
		if (channelId === undefined) throw new SetupError("Bug reporting is not configured on this instance.");

		const landed = await postToLogChannel(client, channelId, {
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
		if (!landed) throw new SetupError("Bug reporting is set up with a channel the bot cannot post in.");

		await reply(interaction, {
			embeds: [successEmbed("Thanks. Your report has been sent.")],
		});
	},
});
