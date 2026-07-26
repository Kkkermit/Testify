import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { actionEmbed, DEFAULT_REASON } from "../services/moderationActions";

const SNOWFLAKE = /^\d{17,20}$/;

export default defineCommand({
	name: "unban",
	description: "Unbans a user by ID.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],
	options: [
		{ name: "user-id", description: "The ID of the banned user.", type: "string", required: true },
		{ name: "reason", description: "Why they are being unbanned.", type: "string", greedy: true },
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const userId = ctx.options.getString("user-id", true).replace(/\D/g, "");
		const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;

		if (!SNOWFLAKE.test(userId)) throw new UserFacingError("That is not a valid user ID.");

		// The previous version compared a User object against a ban entry's user id,
		// so the "is this user banned" check never matched and unban always ran blind.
		const ban = await guild.bans.fetch(userId).catch(() => null);
		if (!ban) throw new UserFacingError("That user is not banned in this server.");

		await guild.bans.remove(userId, `${ctx.user.username}: ${reason}`);

		await ctx.reply({
			embeds: [
				actionEmbed({
					action: "User unbanned",
					emoji: theme.emoji.success,
					guild,
					target: ban.user,
					moderator: ctx.user,
					reason,
				}),
			],
		});
	},
});
