import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { getVoiceCounter, setVoiceCounter } from "../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";
import { syncVoiceCounters } from "../../lib/voiceCounters";

export default defineCommand({
	name: "voice-stats",
	description: "Shows live member and bot counts in voice channel names.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageChannels],
	subcommands: [
		{
			name: "setup",
			description: "Choose the counter channels.",
			options: [
				{
					name: "member-channel",
					description: "The channel showing the member count.",
					type: "channel",
				},
				{
					name: "bot-channel",
					description: "The channel showing the bot count.",
					type: "channel",
				},
			],
			async run(interaction, client) {
				const guild = inGuild(interaction);
				const memberChannel = interaction.options.getChannel("member-channel");
				const botChannel = interaction.options.getChannel("bot-channel");

				if (!memberChannel && !botChannel) throw new UserFacingError("Pick at least one channel.");

				await setVoiceCounter(guild.id, {
					memberChannelId: memberChannel?.id ?? null,
					botChannelId: botChannel?.id ?? null,
				});

				await syncVoiceCounters(client, guild);
				await reply(interaction, { embeds: [successEmbed("Voice counters configured and updated.")] });
			},
		},
		{
			name: "refresh",
			description: "Update the counters now.",
			async run(interaction, client) {
				const guild = inGuild(interaction);
				await syncVoiceCounters(client, guild);
				await reply(interaction, { embeds: [successEmbed("Counters refreshed.")], flags: MessageFlags.Ephemeral });
			},
		},
		{
			name: "status",
			description: "Show the current counter configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getVoiceCounter(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Voice counters",
							fields: [
								{
									name: "Member channel",
									value:
										settings?.memberChannelId !== null && settings !== null
											? `<#${settings.memberChannelId}>`
											: "Not set",
									inline: true,
								},
								{
									name: "Bot channel",
									value:
										settings?.botChannelId !== null && settings !== null ? `<#${settings.botChannelId}>` : "Not set",
									inline: true,
								},
							],
						}),
					],
				});
			},
		},
	],
});
