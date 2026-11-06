import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { clearWarnings, editWarning, getWarnings, removeWarning } from "@database/repositories/moderationRepository";
import { embed, reply, successEmbed } from "@lib/discord";
import { discordTime, mentionOf, truncate } from "@lib/format";
import {
	assertModeratable,
	issueWarning,
	readWarnLadder,
	warnLadderPanel,
	warnedEmbed,
	warningActionText,
} from "@lib/moderation";
import { warningExpired } from "@testify/shared";

const USER_OPTION = { name: "user", description: "The member in question.", type: "user", required: true } as const;
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

				const issued = await issueWarning({
					guild,
					user: target,
					member,
					moderator: { id: interaction.user.id, tag: interaction.user.username },
					reason,
				});

				await reply(interaction, { embeds: [warnedEmbed(target, reason, issued)] });
			},
		},
		{
			name: "punishments",
			private: true,
			description: "Choose what each warning does: a timeout, a kick or a ban.",
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				const guild = inGuild(interaction);

				await reply(interaction, warnLadderPanel(await readWarnLadder(guild.id), interaction.user.id));
			},
		},
		{
			name: "list",
			description: "List a member's warnings.",
			options: [{ name: "user", description: "The member. Defaults to you.", type: "user" }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user") ?? interaction.user;
				const [record, { expireAfterDays }] = await Promise.all([
					getWarnings(guild.id, target.id),
					readWarnLadder(guild.id),
				]);

				if (!record || record.warnings.length === 0) {
					await reply(interaction, { embeds: [successEmbed(`${target} has no warnings.`)] });
					return;
				}

				const expired = (warning: { timestamp: Date }): boolean => warningExpired(warning.timestamp, expireAfterDays);
				const counting = record.warnings.filter((warning) => !expired(warning)).length;
				const total = String(record.warnings.length);

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
							title: `Warnings for ${target.username} (${counting === record.warnings.length ? total : `${total}, ${String(counting)} still counting`})`,
							description: record.warnings
								.slice(-15)
								.map(
									(warning) =>
										`\`${warning.warnId}\` — ${truncate(warning.reason, 80)}\n` +
										`> by ${mentionOf(warning.executorId)} ${discordTime(warning.timestamp, "R")} · ${warningActionText(warning)}` +
										(expired(warning) ? " · no longer counts" : ""),
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

				const [record, { expireAfterDays }] = await Promise.all([
					getWarnings(guild.id, target.id),
					readWarnLadder(guild.id),
				]);
				const warning = record?.warnings.find((candidate) => candidate.warnId === warnId);
				if (!warning) throw new UserFacingError(`No warning with ID \`${warnId}\` for ${target}.`);

				await reply(interaction, {
					embeds: [
						embed({
							category: "moderation",
							title: `Warning ${warning.warnId}`,
							fields: [
								{ name: "User", value: `${target}`, inline: true },
								{ name: "Moderator", value: mentionOf(warning.executorId), inline: true },
								{ name: "Issued", value: discordTime(warning.timestamp, "F"), inline: true },
								{ name: "Action", value: warningActionText(warning), inline: true },
								...(warningExpired(warning.timestamp, expireAfterDays)
									? [{ name: "Counts", value: `No, it is older than ${String(expireAfterDays)} days`, inline: true }]
									: []),
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
			content: "Pick a subcommand: `create`, `list`, `info`, `edit`, `remove`, `clear` or `punishments`.",
			flags: MessageFlags.Ephemeral,
		});
	},

	async autocomplete(interaction) {
		const guildId = interaction.guildId;
		// Autocomplete does not resolve users, so the option arrives as a snowflake.
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
