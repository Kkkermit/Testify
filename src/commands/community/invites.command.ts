import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { latestJoinOf, standingOf, topInviters } from "@database/repositories/inviteRepository";
import { embed, reply } from "@lib/discord";
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

				const lines = [
					`Brought **${String(standing.joins)}** ${standing.joins === 1 ? "member" : "members"}: ${String(standing.joins - standing.left)} still here, ${String(standing.left)} left.`,
				];
				const inviterId = joined?.inviterId ?? null;
				if (joined?.vanity === true) lines.push("Joined with the server's own link.");
				else if (inviterId !== null) lines.push(`Joined with <@${inviterId}>'s invite.`);

				await reply(interaction, {
					embeds: [
						embed({ category: "community", title: `📨 ${target.username}'s invites`, description: lines.join("\n") }),
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
