import { PermissionFlagsBits } from "discord.js";
import { strings } from "@config/strings";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply } from "@lib/discord";
import { actionEmbed, DEFAULT_REASON, moderatorOf, removeTimeout } from "@lib/moderation";

export default defineCommand({
	name: "unmute",
	description: "Removes a member's timeout.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ModerateMembers],
	botPermissions: [PermissionFlagsBits.ModerateMembers],
	options: [
		{ name: "user", description: "The member to untimeout.", type: "user", required: true },
		{ name: "reason", description: "Why the timeout is being lifted.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user", true);
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);
		const { notified: delivered } = await removeTimeout(guild, member, moderatorOf(interaction.user), reason);

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "Timeout removed",
					emoji: theme.emoji.success,
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
