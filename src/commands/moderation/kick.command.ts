import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "@lib/moderationActions.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "kick",
	description: "Kicks a member from the server.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.KickMembers],
	botPermissions: [PermissionFlagsBits.KickMembers],
	options: [
		{ name: "user", description: "The member to kick.", type: "user", required: true },
		{ name: "reason", description: "Why they are being kicked.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		// whenever an ID was supplied instead of a mention.
		const target = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);

		assertModeratable(interaction, member);
		if (!member.kickable) throw new UserFacingError(strings.moderation.notModeratable);

		const delivered = await notifyTarget(
			target,
			dmEmbed({
				action: `kicked from ${guild.name}`,
				emoji: theme.emoji.moderation,
				guild,
				moderator: interaction.user,
				reason,
			}),
		);

		await member.kick(`${interaction.user.username}: ${reason}`);

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "Member kicked",
					emoji: theme.emoji.moderation,
					guild,
					target,
					moderator: interaction.user,
					reason,
					extra: [{ name: "Notified", value: delivered ? "Yes" : "No", inline: true }],
				}),
			],
		});
	},
});
