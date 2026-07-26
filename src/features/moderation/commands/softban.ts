import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	createSoftban,
	deactivateSoftban,
	getActiveSoftban,
	listActiveSoftbans,
} from "../../../database/repositories/moderationRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime, formatDurationLong } from "../../../ui/format";
import { parseDuration } from "../services/duration";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "../services/moderationActions";

export default defineCommand({
	name: "softban",
	description: "Temporarily bans a user, lifting the ban automatically.",
	category: Category.Moderation,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],
	subcommands: [
		{
			name: "add",
			description: "Softban a user for a set duration.",
			options: [
				{ name: "user", description: "The user to softban.", type: "user", required: true },
				{ name: "duration", description: "How long, for example 12h or 7d.", type: "string", required: true },
				{ name: "reason", description: "Why they are being softbanned.", type: "string", greedy: true },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const target = ctx.options.getUser("user", true);
				const reason = ctx.options.getString("reason") ?? DEFAULT_REASON;

				const durationMs = parseDuration(ctx.options.getString("duration", true));
				if (durationMs === null || durationMs <= 0) {
					throw new UserFacingError("That duration is not valid. Try something like `12h` or `7d`.");
				}

				const member = await guild.members.fetch(target.id).catch(() => null);
				if (member) assertModeratable(ctx, member);

				const expiresAt = new Date(Date.now() + durationMs);
				const readable = formatDurationLong(durationMs);

				await notifyTarget(
					target,
					dmEmbed({
						action: `temporarily banned from ${guild.name}`,
						emoji: theme.emoji.moderation,
						guild,
						moderator: ctx.user,
						reason,
						extra: [{ name: "Expires", value: discordTime(expiresAt, "R"), inline: true }],
					}),
				);

				await guild.members.ban(target.id, { reason: `${ctx.user.username} (softban ${readable}): ${reason}` });
				await createSoftban({
					guildId: guild.id,
					userId: target.id,
					moderatorId: ctx.user.id,
					reason,
					expiresAt,
				});

				await ctx.reply({
					embeds: [
						actionEmbed({
							action: "User softbanned",
							emoji: theme.emoji.moderation,
							guild,
							target,
							moderator: ctx.user,
							reason,
							extra: [
								{ name: "Duration", value: readable, inline: true },
								{ name: "Expires", value: discordTime(expiresAt, "R"), inline: true },
							],
						}),
					],
				});
			},
		},
		{
			name: "remove",
			description: "Lift a softban immediately.",
			options: [{ name: "user-id", description: "The ID of the softbanned user.", type: "string", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const userId = ctx.options.getString("user-id", true).replace(/\D/g, "");

				const active = await getActiveSoftban(guild.id, userId);
				if (!active) throw new UserFacingError("There is no active softban for that user.");

				await guild.bans.remove(userId, `Softban lifted early by ${ctx.user.username}`).catch(() => null);
				await deactivateSoftban(guild.id, userId);

				await ctx.reply({ embeds: [successEmbed("The softban has been lifted.")] });
			},
		},
		{
			name: "list",
			description: "List the active softbans in this server.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const active = await listActiveSoftbans(guild.id);

				if (active.length === 0) {
					await ctx.reply({ embeds: [successEmbed("There are no active softbans.")] });
					return;
				}

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Moderation,
							title: `Active softbans (${active.length})`,
							description: active
								.slice(0, 20)
								.map((entry) => `<@${entry.userId}> — expires ${discordTime(entry.expiresAt, "R")}`)
								.join("\n"),
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `add`, `remove` or `list`.", ephemeral: true });
	},
});
