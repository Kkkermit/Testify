import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { theme } from "@config/theme";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	addWarning,
	clearWarnings,
	editWarning,
	getWarnings,
	removeWarning,
} from "@database/repositories/moderationRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { discordTime, truncate } from "@lib/format.util";
import { assertModeratable, dmEmbed, notifyTarget } from "@lib/moderationActions.util";
import { reply } from "@lib/reply.util";

const USER_OPTION = { name: "user", description: "The member in question.", type: "user", required: true } as const;
/** Autocompleted rather than typed. */
const WARN_ID_OPTION = {
	name: "warn-id",
	description: "Start typing to pick a warning.",
	type: "string",
	required: true,
	autocomplete: true,
} as const;

export default defineCommand({
	name: "warn",
	description: "Issues and manages warnings.",
	category: "moderation",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ModerateMembers],
	subcommands: [
		{
			name: "create",
			description: "Warn a member.",
			options: [
				USER_OPTION,
				{ name: "reason", description: "Why they are being warned.", type: "string", required: true },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const reason = interaction.options.getString("reason", true);

				if (target.bot) throw new UserFacingError("Bots cannot be warned.");

				const member = await guild.members.fetch(target.id).catch(() => null);
				if (member) assertModeratable(interaction, member);

				const entry = await addWarning(
					guild.id,
					target.id,
					target.username,
					{ id: interaction.user.id, tag: interaction.user.username },
					reason,
				);

				const delivered = await notifyTarget(
					target,
					dmEmbed({
						action: `warned in ${guild.name}`,
						emoji: theme.emoji.warning,
						guild,
						moderator: interaction.user,
						reason,
						extra: [{ name: "Warning ID", value: `\`${entry.warnId}\``, inline: true }],
					}),
				);

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user") ?? interaction.user;
				const record = await getWarnings(guild.id, target.id);

				if (!record || record.warnings.length === 0) {
					await reply(interaction, { embeds: [successEmbed(`${target} has no warnings.`)] });
					return;
				}

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const warnId = interaction.options.getString("warn-id", true);

				const record = await getWarnings(guild.id, target.id);
				const warning = record?.warnings.find((candidate) => candidate.warnId === warnId);
				if (!warning) throw new UserFacingError(`No warning with ID \`${warnId}\` for ${target}.`);

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
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
				{ name: "reason", description: "The new reason.", type: "string", required: true },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const warnId = interaction.options.getString("warn-id", true);
				const reason = interaction.options.getString("reason", true);

				const updated = await editWarning(guild.id, target.id, warnId, reason, {
					id: interaction.user.id,
					tag: interaction.user.username,
				});
				if (!updated) throw new UserFacingError(`No warning with ID \`${warnId}\` for ${target}.`);

				await reply(interaction, { embeds: [successEmbed(`Warning \`${warnId}\` has been updated.`)] });
			},
		},
		{
			name: "remove",
			description: "Delete a single warning.",
			options: [USER_OPTION, WARN_ID_OPTION],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);
				const warnId = interaction.options.getString("warn-id", true);

				const removed = await removeWarning(guild.id, target.id, warnId);
				if (!removed) throw new UserFacingError(`No warning with ID \`${warnId}\` for ${target}.`);

				await reply(interaction, { embeds: [successEmbed(`Warning \`${warnId}\` has been removed.`)] });
			},
		},
		{
			name: "clear",
			description: "Delete every warning for a member.",
			options: [USER_OPTION],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);

				const cleared = await clearWarnings(guild.id, target.id);
				if (!cleared) throw new UserFacingError(`${target} has no warnings.`);

				await reply(interaction, { embeds: [successEmbed(`Cleared every warning for ${target}.`)] });
			},
		},
	],

	async run(interaction) {
		await reply(interaction, {
			content: "Pick a subcommand: `create`, `list`, `info`, `edit`, `remove` or `clear`.",
			flags: MessageFlags.Ephemeral,
		});
	},

	/** Offers the chosen member's warnings, newest first, described not just listed. */
	async autocomplete(interaction) {
		const guildId = interaction.guildId;
		// Discord does not resolve user objects during autocomplete, so the option
		// comes back as a raw snowflake.
		const targetId = interaction.options.get("user")?.value;
		if (guildId === null || typeof targetId !== "string") {
			await interaction.respond([]);
			return;
		}

		const query = interaction.options.getFocused().toLowerCase();
		const record = await getWarnings(guildId, targetId);

		const choices = (record?.warnings ?? [])
			.slice()
			.reverse()
			.filter((warning) => warning.warnId.toLowerCase().includes(query) || warning.reason.toLowerCase().includes(query))
			.slice(0, 25)
			.map((warning) => ({
				name: truncate(`${warning.warnId} — ${warning.reason}`, 100),
				value: warning.warnId,
			}));

		await interaction.respond(choices);
	},
});
