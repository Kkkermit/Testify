import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { latestJoinOf, standingOf, topInviters } from "@database/repositories/inviteRepository";
import { embed, reply } from "@lib/discord";
import { formatNumber, mentionOf } from "@lib/format";
import { INVITE_COMMAND, inviteSettingsPanel, readInviteSettings, standingLines } from "@lib/invites";
import { INVITE_LIMITS } from "@testify/shared";

export default defineCommand({
	name: INVITE_COMMAND,
	description: "Shows whose invites brought members in, and turns invite tracking on.",
	category: "community",
	guildOnly: true,
	subcommands: [
		{
			name: "view",
			description: "Shows how many members somebody's invites brought in, and whose invite they joined with.",
			options: [{ name: "user", description: "Whose invites to show. Defaults to you.", type: "user" }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user") ?? interaction.user;
				const [standing, joined] = await Promise.all([
					standingOf(guild.id, target.id),
					latestJoinOf(guild.id, target.id),
				]);

				const inviterId = joined?.inviterId ?? null;
				const joinedWith =
					joined?.vanity === true
						? "The server's own link"
						: inviterId === null
							? "Not known"
							: `${mentionOf(inviterId)}'s invite`;

				await reply(interaction, {
					embeds: [
						embed({
							category: "community",
							title: `📨 ${target.username}'s invites`,
							description: `Their invites brought in **${formatNumber(standing.joins)}** ${standing.joins === 1 ? "member" : "members"}.`,
							fields: [
								{ name: "Still here", value: formatNumber(standing.joins - standing.left), inline: true },
								{ name: "Left since", value: formatNumber(standing.left), inline: true },
								{ name: "They joined with", value: joinedWith, inline: true },
							],
						}),
					],
					allowedMentions: { parse: [] },
				});
			},
		},
		{
			name: "top",
			description: "Shows the members whose invites brought in the most people who stayed.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const top = await topInviters(guild.id, INVITE_LIMITS.top);

				await reply(interaction, {
					embeds: [embed({ category: "community", title: "📨 Top inviters", description: standingLines(top) })],
					allowedMentions: { parse: [] },
				});
			},
		},
		{
			name: "settings",
			description: "Turns invite tracking on or off, and picks where joins are announced.",
			private: true,
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const guild = inGuild(interaction);
				await reply(interaction, inviteSettingsPanel(await readInviteSettings(guild), interaction.user.id));
			},
		},
	],
});
