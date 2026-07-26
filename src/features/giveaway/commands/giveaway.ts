import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getGiveawaysManager } from "../../../integrations/giveaways";
import { successEmbed } from "../../../ui/embeds";
import { formatDurationLong } from "../../../ui/format";
import { parseDuration } from "../../moderation/services/duration";

export default defineCommand({
	name: "giveaway",
	description: "Runs giveaways.",
	category: Category.Giveaway,
	surfaces: ["slash"],
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
				{ name: "winners", description: "How many winners.", type: "integer", minValue: 1, maxValue: 20 },
				{
					name: "channel",
					description: "Where to post it. Defaults to this channel.",
					type: "channel",
					channelTypes: [ChannelType.GuildText],
				},
			],
			async execute(ctx) {
				requireGuild(ctx);

				const durationMs = parseDuration(ctx.options.getString("duration", true));
				if (durationMs === null || durationMs <= 0) {
					throw new UserFacingError("That duration is not valid. Try `1h`, `12h` or `3d`.");
				}

				const channel = ctx.options.getChannel("channel") ?? ctx.channel;
				if (!channel?.isTextBased() || !("guild" in channel)) {
					throw new UserFacingError("Pick a text channel in this server.");
				}

				await getGiveawaysManager(ctx.client).start(channel, {
					prize: ctx.options.getString("prize", true),
					winnerCount: ctx.options.getInteger("winners") ?? 1,
					duration: durationMs,
					hostedBy: ctx.user,
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

				await ctx.reply({
					embeds: [successEmbed(`Giveaway started in ${channel}. It runs for **${formatDurationLong(durationMs)}**.`)],
					ephemeral: true,
				});
			},
		},
		{
			name: "end",
			description: "End a running giveaway early.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async execute(ctx) {
				const messageId = ctx.options.getString("message-id", true).trim();

				await getGiveawaysManager(ctx.client)
					.end(messageId)
					.catch(() => {
						throw new UserFacingError("I could not find a running giveaway with that message id.");
					});

				await ctx.reply({ embeds: [successEmbed("The giveaway has been ended.")], ephemeral: true });
			},
		},
		{
			name: "reroll",
			description: "Pick new winners for a finished giveaway.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async execute(ctx) {
				const messageId = ctx.options.getString("message-id", true).trim();

				await getGiveawaysManager(ctx.client)
					.reroll(messageId)
					.catch(() => {
						throw new UserFacingError("I could not reroll that giveaway. Check the message id.");
					});

				await ctx.reply({ embeds: [successEmbed("New winners have been drawn.")], ephemeral: true });
			},
		},
		{
			name: "delete",
			description: "Delete a giveaway.",
			options: [{ name: "message-id", description: "The giveaway message id.", type: "string", required: true }],
			async execute(ctx) {
				const messageId = ctx.options.getString("message-id", true).trim();

				await getGiveawaysManager(ctx.client)
					.delete(messageId)
					.catch(() => {
						throw new UserFacingError("I could not find a giveaway with that message id.");
					});

				await ctx.reply({ embeds: [successEmbed("The giveaway has been deleted.")], ephemeral: true });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `start`, `end`, `reroll` or `delete`.", ephemeral: true });
	},
});
