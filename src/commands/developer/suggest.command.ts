import { strings } from "@config/strings";
import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { SetupError, UserFacingError } from "@core/errors";
import {
	logAuthor,
	loggedChannel,
	loggedChannelText,
	loggedGuild,
	loggedGuildText,
	loggedUser,
	loggedUserText,
	postToLogChannel,
} from "@lib/bot";
import { embed, reply, successEmbed } from "@lib/discord";
import { containsProfanity } from "@lib/moderation";

export default defineCommand({
	name: "suggest",
	description: "Sends a suggestion to the developers.",
	category: "developer",
	private: true,
	cooldown: 60_000,
	options: [{ name: "suggestion", description: "Your idea.", type: "string", required: true, maxLength: 1_500 }],

	async run(interaction, client) {
		const channelId = client.env.CHANNEL_SUGGESTION_LOG;
		if (channelId === undefined) throw new SetupError("Suggestions are not configured on this instance.");

		const suggestion = interaction.options.getString("suggestion", true);
		if (containsProfanity(suggestion)) throw new UserFacingError(strings.generic.profanity);

		const user = loggedUser(interaction.user);
		const landed = await postToLogChannel(client, channelId, {
			embeds: [
				embed({
					colour: theme.colours.info,
					author: logAuthor(user),
					title: "💡 Suggestion",
					description: suggestion,
					fields: [
						{ name: "Suggested by", value: loggedUserText(user), inline: true },
						{ name: "Server", value: loggedGuildText(loggedGuild(interaction.guild)), inline: true },
						{
							name: "Channel",
							value: loggedChannelText(interaction.guild === null ? null : loggedChannel(interaction.channel, null)),
							inline: true,
						},
					],
					thumbnail: user.avatarUrl,
				}),
			],
			allowedMentions: { parse: [] },
		});
		if (!landed) throw new SetupError("Suggestions are set up with a channel the bot cannot post in.");

		await reply(interaction, {
			embeds: [successEmbed("Thanks. Your suggestion has been sent.")],
		});
	},
});
