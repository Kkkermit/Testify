import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { parseDuration } from "@lib/duration.util";
import { successEmbed } from "@lib/embeds.util";
import { formatDurationLong } from "@lib/format.util";
import { deleteGiveaway, endGiveaway, rerollGiveaway, startGiveaway } from "@lib/giveawayActions.util";
import { reply } from "@lib/reply.util";

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
				const guild = inGuild(interaction);

				const durationMs = parseDuration(interaction.options.getString("duration", true));
				if (durationMs === null || durationMs <= 0) {
					throw new UserFacingError("That duration is not valid. Try `1h`, `12h` or `3d`.");
				}

				const channel = textChannelOption(interaction, "channel") ?? interaction.channel;
				if (!channel?.isTextBased() || !("guild" in channel)) {
					throw new UserFacingError("Pick a text channel in this server.");
				}

				await startGiveaway(client, guild, {
					channelId: channel.id,
					prize: interaction.options.getString("prize", true),
					winnerCount: interaction.options.getInteger("winners") ?? 1,
					durationMs,
					hostedBy: interaction.user,
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

				await endGiveaway(client, messageId);

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

				await rerollGiveaway(client, messageId);

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

				await deleteGiveaway(client, messageId);

				await reply(interaction, {
					embeds: [successEmbed("The giveaway has been deleted.")],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
