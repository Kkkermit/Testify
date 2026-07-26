import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { NotFoundError, UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	addWarning,
	clearWarnings,
	editWarning,
	getWarnings,
	removeWarning,
} from "../../../database/repositories/moderationRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime, truncate } from "../../../ui/format";
import { DEFAULT_REASON, dmEmbed, notifyTarget } from "../services/moderationActions";

const USER_OPTION = { name: "user", description: "The member in question.", type: "user", required: true } as const;
const WARN_ID_OPTION = { name: "warn-id", description: "The warning ID.", type: "string", required: true } as const;

export default defineCommand({
	name: "warn",
	description: "Issues and manages warnings.",
	category: Category.Moderation,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ModerateMembers],
	subcommands: [
		{
			name: "create",
			description: "Warn a member.",
			options: [
				USER_OPTION,
				{ name: "reason", description: "Why they are being warned.", type: "string", required: true, greedy: true },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const reason = ctx.options.getString("reason", true);

				if (target.bot) throw new UserFacingError("Bots cannot be warned.");
				if (target.id === ctx.user.id) throw new UserFacingError("You cannot warn yourself.");

				const entry = await addWarning(
					guild.id,
					target.id,
					target.username,
					{ id: ctx.user.id, tag: ctx.user.username },
					reason,
				);

				const delivered = await notifyTarget(
					target,
					dmEmbed({
						action: `warned in ${guild.name}`,
						emoji: theme.emoji.warning,
						guild,
						moderator: ctx.user,
						reason,
						extra: [{ name: "Warning ID", value: `\`${entry.warnId}\``, inline: true }],
					}),
				);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: `${theme.emoji.warning} Member warned`,
							fields: [
								{ name: "User", value: `${target}`, inline: true },
								{ name: "Warning ID", value: `\`${entry.warnId}\``, inline: true },
								{ name: "Notified", value: delivered ? "Yes" : "No", inline: true },
								{ name: "Reason", value: reason },
							],
						}),
					],
				});
			},
		},
		{
			name: "list",
			description: "List a member's warnings.",
			options: [{ name: "user", description: "The member. Defaults to you.", type: "user" }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user") ?? ctx.user;
				const record = await getWarnings(guild.id, target.id);

				if (!record || record.warnings.length === 0) {
					await ctx.reply({ embeds: [successEmbed(`${target} has no warnings.`)] });
					return;
				}

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: `Warnings for ${target.username} (${record.warnings.length})`,
							description: record.warnings
								.slice(-15)
								.map(
									(warning) =>
										`\`${warning.warnId}\` — ${truncate(warning.reason, 80)}\n` +
										`> by <@${warning.executorId}> ${discordTime(warning.timestamp, "R")}`,
								)
								.join("\n\n"),
							thumbnail: target.displayAvatarURL(),
						}),
					],
				});
			},
		},
		{
			name: "info",
			description: "Show one warning in full, including its edit history.",
			options: [USER_OPTION, WARN_ID_OPTION],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const warnId = ctx.options.getString("warn-id", true);

				const record = await getWarnings(guild.id, target.id);
				const warning = record?.warnings.find((candidate) => candidate.warnId === warnId);
				if (!warning) throw new NotFoundError(`No warning with ID \`${warnId}\` for ${target}.`);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: `Warning ${warning.warnId}`,
							fields: [
								{ name: "User", value: `${target}`, inline: true },
								{ name: "Moderator", value: `<@${warning.executorId}>`, inline: true },
								{ name: "Issued", value: discordTime(warning.timestamp, "F") },
								{ name: "Reason", value: warning.reason },
								{
									name: `Edits (${warning.edits.length})`,
									value:
										warning.edits
											.map(
												(edit) =>
													`${discordTime(edit.editedAt, "R")} by <@${edit.editedById}>\n` +
													`> "${truncate(edit.oldReason, 60)}" → "${truncate(edit.newReason, 60)}"`,
											)
											.join("\n") || "None",
								},
							],
						}),
					],
				});
			},
		},
		{
			name: "edit",
			description: "Change the reason on a warning.",
			options: [
				USER_OPTION,
				WARN_ID_OPTION,
				{ name: "reason", description: "The new reason.", type: "string", required: true, greedy: true },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const warnId = ctx.options.getString("warn-id", true);
				const reason = ctx.options.getString("reason", true);

				const updated = await editWarning(guild.id, target.id, warnId, reason, {
					id: ctx.user.id,
					tag: ctx.user.username,
				});
				if (!updated) throw new NotFoundError(`No warning with ID \`${warnId}\` for ${target}.`);

				await ctx.reply({ embeds: [successEmbed(`Warning \`${warnId}\` has been updated.`)] });
			},
		},
		{
			name: "remove",
			description: "Delete a single warning.",
			options: [USER_OPTION, WARN_ID_OPTION],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const warnId = ctx.options.getString("warn-id", true);

				const removed = await removeWarning(guild.id, target.id, warnId);
				if (!removed) throw new NotFoundError(`No warning with ID \`${warnId}\` for ${target}.`);

				await ctx.reply({ embeds: [successEmbed(`Warning \`${warnId}\` has been removed.`)] });
			},
		},
		{
			name: "clear",
			description: "Delete every warning for a member.",
			options: [USER_OPTION],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);

				const cleared = await clearWarnings(guild.id, target.id);
				if (!cleared) throw new NotFoundError(`${target} has no warnings.`);

				await ctx.reply({ embeds: [successEmbed(`Cleared every warning for ${target}.`)] });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({
			content: "Pick a subcommand: `create`, `list`, `info`, `edit`, `remove` or `clear`.",
			ephemeral: true,
		});
	},
});

export const DEFAULT_WARN_REASON = DEFAULT_REASON;
