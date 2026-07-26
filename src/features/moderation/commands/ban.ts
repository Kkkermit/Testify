import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { strings } from "../../../config/strings";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "../services/moderationActions";

export default defineCommand({
	name: "ban",
	description: "Bans a user from the server.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],
	options: [
		{ name: "user", description: "The user to ban.", type: "user", required: true },
		{ name: "reason", description: "Why they are being banned.", type: "string", greedy: true },
		{
			name: "delete-days",
			description: "Days of their messages to delete (0-7).",
			type: "integer",
			minValue: 0,
			maxValue: 7,
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const target = ctx.options.getUser("user", true);
		const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;
		const deleteDays = ctx.options.getInteger("delete-days") ?? 0;

		if (target.id === ctx.client.user?.id) throw new UserFacingError(strings.moderation.botTarget);
		if (target.id === ctx.user.id) throw new UserFacingError(strings.moderation.selfTarget);

		const member = await guild.members.fetch(target.id).catch(() => null);
		if (member) assertModeratable(ctx, member);

		const existing = await guild.bans.fetch(target.id).catch(() => null);
		if (existing) throw new UserFacingError(`${target.username} is already banned.`);

		const delivered = member
			? await notifyTarget(
					target,
					dmEmbed({
						action: `banned from ${guild.name}`,
						emoji: theme.emoji.moderation,
						guild,
						moderator: ctx.user,
						reason,
					}),
				)
			: false;

		await guild.members.ban(target.id, {
			reason: `${ctx.user.username}: ${reason}`,
			deleteMessageSeconds: deleteDays * 86_400,
		});

		await ctx.reply({
			embeds: [
				actionEmbed({
					action: "User banned",
					emoji: theme.emoji.moderation,
					guild,
					target,
					moderator: ctx.user,
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
