import { PermissionFlagsBits } from "discord.js";
import { theme } from "../../config/theme";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import {
	createSoftban,
	deactivateSoftban,
	getActiveSoftban,
	listActiveSoftbans,
} from "../../database/repositories/moderationRepository";
import { parseDuration } from "../../lib/duration";
import { embed, successEmbed } from "../../lib/embeds";
import { discordTime, formatDurationLong } from "../../lib/format";
import { actionEmbed, assertModeratable, DEFAULT_REASON, dmEmbed, notifyTarget } from "../../lib/moderationActions";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "softban",
	description: "Temporarily bans a user, lifting the ban automatically.",
	category: "moderation",
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
				{ name: "reason", description: "Why they are being softbanned.", type: "string" },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const reason = interaction.options.getString("reason") ?? DEFAULT_REASON;

				const durationMs = parseDuration(interaction.options.getString("duration", true));
				if (durationMs === null || durationMs <= 0) {
					throw new UserFacingError("That duration is not valid. Try something like `12h` or `7d`.");
				}

				const member = await guild.members.fetch(target.id).catch(() => null);
				if (member) assertModeratable(interaction, member);

				const expiresAt = new Date(Date.now() + durationMs);
				const readable = formatDurationLong(durationMs);

				await notifyTarget(
					target,
					dmEmbed({
						action: `temporarily banned from ${guild.name}`,
						emoji: theme.emoji.moderation,
						guild,
						moderator: interaction.user,
						reason,
						extra: [{ name: "Expires", value: discordTime(expiresAt, "R"), inline: true }],
					}),
				);

				await guild.members.ban(target.id, { reason: `${interaction.user.username} (softban ${readable}): ${reason}` });
				await createSoftban({
					guildId: guild.id,
					userId: target.id,
					moderatorId: interaction.user.id,
					reason,
					expiresAt,
				});

				await reply(interaction, {
					embeds: [
						actionEmbed({
							action: "User softbanned",
							emoji: theme.emoji.moderation,
							guild,
							target,
							moderator: interaction.user,
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const userId = interaction.options.getString("user-id", true).replace(/\D/g, "");

				const active = await getActiveSoftban(guild.id, userId);
				if (!active) throw new UserFacingError("There is no active softban for that user.");

				await guild.bans.remove(userId, `Softban lifted early by ${interaction.user.username}`).catch(() => null);
				await deactivateSoftban(guild.id, userId);

				await reply(interaction, { embeds: [successEmbed("The softban has been lifted.")] });
			},
		},
		{
			name: "list",
			description: "List the active softbans in this server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const active = await listActiveSoftbans(guild.id);

				if (active.length === 0) {
					await reply(interaction, { embeds: [successEmbed("There are no active softbans.")] });
					return;
				}

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
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
});
