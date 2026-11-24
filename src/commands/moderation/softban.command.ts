import { PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createSoftban, listActiveSoftbans } from "@database/repositories/moderationRepository";
import { embed, reply, successEmbed } from "@lib/discord";
import { discordTime, formatDurationLong, parseDuration } from "@lib/format";
import {
	actionEmbed,
	assertModeratable,
	DEFAULT_REASON,
	dmEmbed,
	moderatorOf,
	notifyTarget,
	recordCase,
	revokeSoftban,
} from "@lib/moderation";

/** An autocomplete row is plain text, so the expiry is written out rather than as a Discord timestamp. */
const UNTIL = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
	timeZone: "UTC",
});

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
				await recordCase(guild, {
					action: "softban",
					user: target,
					moderator: moderatorOf(interaction.user),
					reason,
					durationMs,
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
			options: [
				{
					name: "user-id",
					description: "Pick the softbanned member, or paste their ID.",
					type: "string",
					required: true,
					autocomplete: true,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const userId = interaction.options.getString("user-id", true).replace(/\D/g, "");

				if (!(await revokeSoftban(guild, userId, moderatorOf(interaction.user)))) {
					throw new UserFacingError("There is no active softban for that user.");
				}

				await reply(interaction, { embeds: [successEmbed("The softban has been lifted.")] });
			},
		},
		{
			name: "list",
			private: true,
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

	async autocomplete(interaction, client) {
		const guildId = interaction.guildId;
		if (guildId === null) {
			await interaction.respond([]);
			return;
		}

		const typed = interaction.options.getFocused().trim().toLowerCase();
		const choices = (await listActiveSoftbans(guildId))
			.map((entry) => ({
				name: `${client.users.cache.get(entry.userId)?.username ?? entry.userId} · until ${UNTIL.format(entry.expiresAt)} UTC`,
				value: entry.userId,
			}))
			.filter((choice) => choice.name.toLowerCase().includes(typed))
			.slice(0, 25);

		await interaction.respond(choices);
	},
});
