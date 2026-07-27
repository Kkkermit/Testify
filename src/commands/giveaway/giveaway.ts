import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { parseDuration } from "@lib/duration";
import { successEmbed } from "@lib/embeds";
import { formatDurationLong } from "@lib/format";
import { giveaways } from "@lib/giveaways";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "giveaway",
	description: "Runs giveaways.",
	category: "giveaway",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
	subcommands: [
		{
			name: "start",
			description: "Start a giveaway.",
			options: [
				{ name: "prize", description: "What is being given away.", type: "string", required: true, maxLength: 256 },
				{ name: "duration", description: "How long it runs, for example 1h or 3d.", type: "string", required: true },
				{ name: "winners", description: "How many winners.", type: "integer", min: 1, max: 20 },
				{
					name: "channel",
					description: "Where to post it. Defaults to this channel.",
					type: "channel",
				},
			],
			async run(interaction, client) {
				inGuild(interaction);

				const durationMs = parseDuration(interaction.options.getString("duration", true));
				if (durationMs === null || durationMs <= 0) {
					throw new UserFacingError("That duration is not valid. Try `1h`, `12h` or `3d`.");
				}

				const channel = textChannelOption(interaction, "channel") ?? interaction.channel;
				if (!channel?.isTextBased() || !("guild" in channel)) {
					throw new UserFacingError("Pick a text channel in this server.");
				}

				await giveaways(client).start(channel, {
					prize: interaction.options.getString("prize", true),
					winnerCount: interaction.options.getInteger("winners") ?? 1,
					duration: durationMs,
					hostedBy: interaction.user,
					messages: {
						giveaway: "\u{1f389} **Giveaway** \u{1f389}",
						giveawayEnded: "\u{1f389} **Giveaway ended** \u{1f389}",
						inviteToParticipate: "React with \u{1f389} to enter",
						winMessage: "Congratulations {winners}, you won **{this.prize}**!",
						drawing: "Drawing in {timestamp}",
						dropMessage: "Be the first to react to win!",
						embedFooter: "{this.winnerCount} winner(s)",
						noWinner: "Nobody entered, so there is no winner.",
						hostedBy: "Hosted by {this.hostedBy}",
						winners: "Winner(s)",
						endedAt: "Ended at",
					},
				});

				await reply(interaction, {
					embeds: [successEmbed(`Giveaway started in ${channel}. It runs for **${formatDurationLong(durationMs)}**.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "end",
			description: "End a running giveaway early.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async run(interaction, client) {
				const messageId = interaction.options.getString("message-id", true).trim();

				await giveaways(client)
					.end(messageId)
					.catch(() => {
						throw new UserFacingError("I could not find a running giveaway with that message id.");
					});

				await reply(interaction, {
					embeds: [successEmbed("The giveaway has been ended.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "reroll",
			description: "Pick new winners for a finished giveaway.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async run(interaction, client) {
				const messageId = interaction.options.getString("message-id", true).trim();

				await giveaways(client)
					.reroll(messageId)
					.catch(() => {
						throw new UserFacingError("I could not reroll that giveaway. Check the message id.");
					});

				await reply(interaction, {
					embeds: [successEmbed("New winners have been drawn.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "delete",
			description: "Delete a giveaway.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async run(interaction, client) {
				const messageId = interaction.options.getString("message-id", true).trim();

				await giveaways(client)
					.delete(messageId)
					.catch(() => {
						throw new UserFacingError("I could not find a giveaway with that message id.");
					});

				await reply(interaction, {
					embeds: [successEmbed("The giveaway has been deleted.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
