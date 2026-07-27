import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "@lib/moderationActions";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "ban",
	description: "Bans a user from the server.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],
	options: [
		{ name: "user", description: "The user to ban.", type: "user", required: true },
		{ name: "reason", description: "Why they are being banned.", type: "string" },
		{
			name: "delete-days",
			description: "Days of their messages to delete (0-7).",
			type: "integer",
			min: 0,
			max: 7,
		},
	],

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;
		const deleteDays = interaction.options.getInteger("delete-days") ?? 0;

		if (target.id === client.user?.id) throw new UserFacingError(strings.moderation.botTarget);
		if (target.id === interaction.user.id) throw new UserFacingError(strings.moderation.selfTarget);

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (member) assertModeratable(interaction, member);

		const existing = await guild.bans.fetch(target.id).catch(() => null);
		if (existing) throw new UserFacingError(`${target.username} is already banned.`);

		const delivered = member
			? await notifyTarget(
					target,
					dmEmbed({
						action: `banned from ${guild.name}`,
						emoji: theme.emoji.moderation,
						guild,
						moderator: interaction.user,
						reason,
					}),
				)
			: false;

		await guild.members.ban(target.id, {
			reason: `${interaction.user.username}: ${reason}`,
			deleteMessageSeconds: deleteDays * 86_400,
		});

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "User banned",
					emoji: theme.emoji.moderation,
					guild,
					target,
					moderator: interaction.user,
					reason,
					extra: [
						{ name: "Messages deleted", value: `${deleteDays} day(s)`, inline: true },
						{ name: "Notified", value: delivered ? "Yes" : "No", inline: true },
					],
				}),
			],
		});
	},
});
