import { PermissionFlagsBits } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type CommandInput, type CommandOption, defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { readerLanguage } from "@core/language";
import { reply, requirePostable, successEmbed } from "@lib/discord";
import { discordTime, escapeMarkdown, formatDurationLong, parseDuration, truncate } from "@lib/format";
import {
	deleteGiveaway,
	endGiveaway,
	findGiveaway,
	listGiveaways,
	rerollGiveaway,
	startGiveaway,
} from "@lib/giveaways";
import { type GiveawayRow } from "@testify/shared";

const MESSAGE_ID: CommandOption = {
	name: "message-id",
	description: "Pick the giveaway, or paste the ID of its message.",
	type: "string",
	required: true,
	autocomplete: true,
};

/** `discord-giveaways` finds a message wherever the bot is, so this keeps a manager inside their own server. */
async function giveawayHere(interaction: CommandInput, client: TestifyClient): Promise<GiveawayRow> {
	const messageId = interaction.options.getString("message-id", true).trim();
	const found = await findGiveaway(client, inGuild(interaction).id, messageId);
	if (found === null) throw new UserFacingError("There is no giveaway with that message ID in this server.");

	return found;
}

const prizeOf = (giveaway: GiveawayRow): string => `**${escapeMarkdown(giveaway.prize)}**`;

export default defineCommand({
	name: "giveaway",
	description: "Runs giveaways.",
	category: "giveaway",
	private: true,
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
				{
					name: "winners",
					description: "How many winners to draw. 1 unless you say.",
					type: "integer",
					min: 1,
					max: 20,
				},
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
				requirePostable(channel, readerLanguage(interaction), [PermissionFlagsBits.EmbedLinks]);

				const prize = interaction.options.getString("prize", true);
				await startGiveaway(client, guild, {
					channelId: channel.id,
					prize,
					winnerCount: interaction.options.getInteger("winners") ?? 1,
					durationMs,
					hostedBy: interaction.user,
				});

				await reply(interaction, {
					embeds: [
						successEmbed(
							`The giveaway for **${escapeMarkdown(prize)}** is up in ${channel.toString()}. It ends ${discordTime(Date.now() + durationMs, "R")}, after **${formatDurationLong(durationMs)}**.`,
						),
					],
				});
			},
		},
		{
			name: "end",
			description: "End a running giveaway early.",
			options: [MESSAGE_ID],
			async run(interaction, client) {
				const giveaway = await giveawayHere(interaction, client);
				await endGiveaway(client, inGuild(interaction).id, giveaway.messageId);

				await reply(interaction, { embeds: [successEmbed(`Ended the giveaway for ${prizeOf(giveaway)}.`)] });
			},
		},
		{
			name: "reroll",
			description: "Pick new winners for a finished giveaway.",
			options: [MESSAGE_ID],
			async run(interaction, client) {
				const giveaway = await giveawayHere(interaction, client);
				await rerollGiveaway(client, inGuild(interaction).id, giveaway.messageId);

				await reply(interaction, { embeds: [successEmbed(`Drew new winners for ${prizeOf(giveaway)}.`)] });
			},
		},
		{
			name: "delete",
			description: "Deletes a giveaway and its message, without drawing anybody.",
			options: [MESSAGE_ID],
			async run(interaction, client) {
				const giveaway = await giveawayHere(interaction, client);
				await deleteGiveaway(client, inGuild(interaction).id, giveaway.messageId);

				await reply(interaction, { embeds: [successEmbed(`Deleted the giveaway for ${prizeOf(giveaway)}.`)] });
			},
		},
	],

	async autocomplete(interaction, client) {
		const guildId = interaction.guildId;
		if (guildId === null) {
			await interaction.respond([]);
			return;
		}

		const subcommand = interaction.options.getSubcommand(false);
		const typed = interaction.options.getFocused().trim().toLowerCase();
		const offered = (await listGiveaways(client, guildId))
			.filter((row) => (subcommand === "end" ? !row.ended : subcommand === "reroll" ? row.ended : true))
			.filter((row) => row.prize.toLowerCase().includes(typed) || row.messageId.startsWith(typed))
			.slice(0, 25);

		await interaction.respond(
			offered.map((row) => ({
				name: truncate(`${row.prize} · ${row.ended ? "ended" : "running"}`, 100),
				value: row.messageId,
			})),
		);
	},
});
