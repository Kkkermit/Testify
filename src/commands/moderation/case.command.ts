import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { embed, reply, successEmbed } from "@lib/discord";
import { discordTime, truncate } from "@lib/format";
import { applyCaseSettings, CASE_ACTION_LABELS, caseEmbed, readCase, readCases } from "@lib/moderation";

/** Every warning, timeout, kick, ban and softban, numbered, and where new ones are posted. */
export default defineCommand({
	name: "case",
	description: "Looks up moderation cases, and chooses where they are logged.",
	category: "moderation",
	guildOnly: true,
	subcommands: [
		{
			name: "view",
			description: "Shows one case by its number.",
			private: true,
			permissions: [PermissionFlagsBits.ModerateMembers],
			options: [{ name: "number", description: "The case number.", type: "integer", required: true, min: 1 }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const modCase = await readCase(guild.id, interaction.options.getInteger("number", true));

				await reply(interaction, { embeds: [caseEmbed(modCase)], allowedMentions: { parse: [] } });
			},
		},
		{
			name: "list",
			description: "Shows the latest cases, or one member's.",
			aliases: ["cases"],
			private: true,
			permissions: [PermissionFlagsBits.ModerateMembers],
			options: [{ name: "user", description: "Only this member's cases.", type: "user" }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const user = interaction.options.getUser("user");
				const page = await readCases(guild.id, user === null ? {} : { userId: user.id });

				const lines = page.items.map(
					(modCase) =>
						`**${modCase.number === null ? "—" : `#${String(modCase.number)}`}** · ${CASE_ACTION_LABELS[modCase.action]} · <@${modCase.userId}> · ${truncate(modCase.reason, 60)} · ${discordTime(new Date(modCase.at), "R")}`,
				);

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
							title: user === null ? "Latest cases" : `Cases for ${user.username}`,
							description: lines.length === 0 ? "No cases yet." : lines.join("\n"),
							...(page.total > page.items.length
								? {
										footer: `The ${String(page.items.length)} newest of ${String(page.total)}. The dashboard lists them all.`,
									}
								: {}),
						}),
					],
					allowedMentions: { parse: [] },
				});
			},
		},
		{
			name: "log",
			description: "Chooses where new cases are posted. Leave the channel out to stop posting them.",
			private: true,
			permissions: [PermissionFlagsBits.ManageGuild],
			options: [{ name: "channel", description: "Where new cases are posted.", type: "channel" }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = interaction.options.getChannel("channel");
				const settings = await applyCaseSettings(guild, channel?.id ?? null, interaction.user.id);

				await reply(interaction, {
					embeds: [
						successEmbed(
							settings.logChannelId === null
								? "New cases are no longer posted anywhere. They are still recorded."
								: `New cases are posted in <#${settings.logChannelId}>.`,
						),
					],
				});
			},
		},
	],
});
