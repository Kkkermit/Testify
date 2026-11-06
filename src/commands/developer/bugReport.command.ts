import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { SetupError } from "@core/errors";
import { logAuthor, loggedUser, loggedUserText, postToLogChannel, placeFields } from "@lib/bot";
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

		const user = loggedUser(interaction.user);
		const landed = await postToLogChannel(client, channelId, {
			embeds: [
				embed({
					colour: theme.colours.notice,
					author: logAuthor(user),
					title: "🐛 Bug report",
					description: `### ${interaction.options.getString("summary", true)}\n${interaction.options.getString("details", true)}`,
					fields: [{ name: "Reported by", value: loggedUserText(user), inline: true }, ...placeFields(interaction)],
					thumbnail: user.avatarUrl,
				}),
			],
			allowedMentions: { parse: [] },
		});
		if (!landed) throw new SetupError("Bug reporting is set up with a channel the bot cannot post in.");

		await reply(interaction, {
			embeds: [successEmbed("Thanks. Your report has been sent.")],
		});
	},
});
