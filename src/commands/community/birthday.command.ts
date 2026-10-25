import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import {
	BIRTHDAY_COMMAND,
	birthdaySettingsPanel,
	dayMonth,
	readBirthdayOverview,
	readBirthdaySettings,
	removeOwnBirthday,
	setOwnBirthday,
} from "@lib/birthdays";
import { embed, reply } from "@lib/discord";
import { MONTHS } from "@testify/shared";

/** Birthdays a member shares with one server, and the post that server makes on the day. */
export default defineCommand({
	name: BIRTHDAY_COMMAND,
	description: "Shares your birthday with this server, or sets up birthday posts.",
	category: "community",
	guildOnly: true,
	subcommands: [
		{
			name: "set",
			description: "Shares your birthday with this server: the day and month, never the year.",
			private: true,
			options: [
				{ name: "day", description: "The day of the month.", type: "integer", required: true, min: 1, max: 31 },
				{
					name: "month",
					description: "The month.",
					type: "integer",
					required: true,
					choices: MONTHS.map((name, index) => ({ name, value: index + 1 })),
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const shared = await setOwnBirthday(
					guild.id,
					interaction.user,
					interaction.options.getInteger("day", true),
					interaction.options.getInteger("month", true),
				);
				const settings = await readBirthdaySettings(guild);

				await reply(interaction, {
					embeds: [
						embed({
							category: "community",
							title: "🎂 Birthday shared",
							description: [
								`This server will wish you a happy birthday on **${dayMonth(shared.day, shared.month)}**. Only the day and month are kept.`,
								settings.enabled
									? `It is posted in <#${settings.channelId ?? ""}>, in UTC.`
									: "This server has not turned birthday posts on yet, so nothing is posted until it does.",
								"Take it back at any time with `/birthday remove`.",
							].join("\n"),
						}),
					],
				});
			},
		},
		{
			name: "remove",
			description: "Takes your birthday back from this server.",
			private: true,
			async run(interaction) {
				await removeOwnBirthday(inGuild(interaction).id, interaction.user.id);
				await reply(interaction, {
					embeds: [
						embed({
							category: "community",
							title: "Birthday removed",
							description: "This server no longer knows your birthday.",
						}),
					],
				});
			},
		},
		{
			name: "list",
			description: "Shows the birthdays coming up in this server.",
			aliases: ["birthdays"],
			private: true,
			async run(interaction) {
				const overview = await readBirthdayOverview(inGuild(interaction));
				const lines = overview.upcoming
					.slice(0, 10)
					.map((entry) => `**${dayMonth(entry.day, entry.month)}** · <@${entry.userId}>`);

				await reply(interaction, {
					embeds: [
						embed({
							category: "community",
							title: "🎂 Coming up",
							description:
								lines.length === 0
									? "Nobody has shared a birthday with this server yet. Share yours with `/birthday set`."
									: lines.join("\n"),
						}),
					],
					allowedMentions: { parse: [] },
				});
			},
		},
		{
			name: "settings",
			description: "Turns birthday posts on or off, and chooses where they go.",
			private: true,
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const overview = await readBirthdayOverview(inGuild(interaction));
				await reply(interaction, birthdaySettingsPanel(overview, overview.shared, interaction.user.id));
			},
		},
	],
});
