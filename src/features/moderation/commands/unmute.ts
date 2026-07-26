import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { actionEmbed, DEFAULT_REASON, dmEmbed, notifyTarget } from "../services/moderationActions";

export default defineCommand({
	name: "unmute",
	description: "Removes a member's timeout.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	aliases: ["untimeout"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ModerateMembers],
	botPermissions: [PermissionFlagsBits.ModerateMembers],
	options: [
		{ name: "user", description: "The member to untimeout.", type: "user", required: true },
		{ name: "reason", description: "Why the timeout is being lifted.", type: "string", greedy: true },
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user", true);
		const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (!member) throw new UserFacingError(strings.moderation.memberNotFound);
		if (member.communicationDisabledUntilTimestamp === null) {
			throw new UserFacingError(`${target.username} is not currently timed out.`);
		}
		if (!member.moderatable) throw new UserFacingError(strings.moderation.notModeratable);

		await member.timeout(null, `${ctx.user.username}: ${reason}`);

		const delivered = await notifyTarget(
			target,
			dmEmbed({
				action: `untimed out in ${guild.name}`,
				emoji: theme.emoji.success,
				guild,
				moderator: ctx.user,
				reason,
			}),
		);

		await ctx.reply({
			embeds: [
				actionEmbed({
					action: "Timeout removed",
					emoji: theme.emoji.success,
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
