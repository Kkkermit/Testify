import { PermissionFlagsBits } from "discord.js";
import { theme } from "../../config/theme";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { actionEmbed, DEFAULT_REASON } from "../../lib/moderationActions";
import { reply } from "../../lib/reply";

const SNOWFLAKE = /^\d{17,20}$/;

export default defineCommand({
	name: "unban",
	description: "Unbans a user by ID.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],
	options: [
		{ name: "user-id", description: "The ID of the banned user.", type: "string", required: true },
		{ name: "reason", description: "Why they are being unbanned.", type: "string" },
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const userId = interaction.options.getString("user-id", true).replace(/\D/g, "");
		const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

		if (!SNOWFLAKE.test(userId)) throw new UserFacingError("That is not a valid user ID.");

		// The previous version compared a User object against a ban entry's user id,
		// so the "is this user banned" check never matched and unban always ran blind.
		const ban = await guild.bans.fetch(userId).catch(() => null);
		if (!ban) throw new UserFacingError("That user is not banned in this server.");

		await guild.bans.remove(userId, `${interaction.user.username}: ${reason}`);

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "User unbanned",
					emoji: theme.emoji.success,
					guild,
					target: ban.user,
					moderator: interaction.user,
					reason,
				}),
			],
		});
	},
});
