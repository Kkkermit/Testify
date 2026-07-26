import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "../services/moderationActions";

export default defineCommand({
	name: "kick",
	description: "Kicks a member from the server.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.KickMembers],
	botPermissions: [PermissionFlagsBits.KickMembers],
	options: [
		{ name: "user", description: "The member to kick.", type: "user", required: true },
		{ name: "reason", description: "Why they are being kicked.", type: "string", greedy: true },
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		// The previous prefix version read args[1] here, so it kicked the wrong person
		// whenever an ID was supplied instead of a mention.
		const target = ctx.options.getUser("user", true);
		const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);

		assertModeratable(ctx, member);
		if (!member.kickable) throw new UserFacingError(strings.moderation.notModeratable);

		const delivered = await notifyTarget(
			target,
			dmEmbed({
				action: `kicked from ${guild.name}`,
				emoji: theme.emoji.moderation,
				guild,
				moderator: ctx.user,
				reason,
			}),
		);

		await member.kick(`${ctx.user.username}: ${reason}`);

		await ctx.reply({
			embeds: [
				actionEmbed({
					action: "Member kicked",
					emoji: theme.emoji.moderation,
					guild,
					target,
					moderator: ctx.user,
					reason,
					extra: [{ name: "Notified", value: delivered ? "Yes" : "No", inline: true }],
				}),
			],
		});
	},
});
