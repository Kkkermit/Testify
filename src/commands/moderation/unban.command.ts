import { PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { reply } from "@lib/discord";
import { actionEmbed, DEFAULT_REASON, moderatorOf, unbanUser } from "@lib/moderation";

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

		const unbanned = await unbanUser(guild, userId, moderatorOf(interaction.user), reason);

		await reply(interaction, {
			embeds: [
				actionEmbed({
					action: "User unbanned",
					emoji: theme.emoji.success,
					guild,
					target: unbanned,
					moderator: interaction.user,
					reason,
				}),
			],
		});
	},
});
