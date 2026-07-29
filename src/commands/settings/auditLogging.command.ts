import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, textChannelOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { disableAuditLog, getAuditLogConfig, setAuditLogConfig } from "@database/repositories/settingsRepository";
import { AUDIT_EVENTS } from "@lib/auditLog.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "audit-logging",
	description: "Logs server events to a channel.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
	subcommands: [
		{
			name: "enable",
			description: "Choose the audit log channel.",
			options: [
				{
					name: "channel",
					description: "Where audit entries are posted.",
					type: "channel",
					required: true,
				},
				{
					name: "events",
					description: "Comma-separated event names, or `all`.",
					type: "string",
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const channel = textChannelOption(interaction, "channel");
				if (!channel?.isTextBased() || !channel.isSendable()) throw new UserFacingError("Pick a text channel.");

				const raw = interaction.options.getString("events")?.trim().toLowerCase();
				const enabled =
					raw === undefined || raw === "all"
						? ["all"]
						: raw
								.split(",")
								.map((entry) => entry.trim())
								.filter((entry) => (AUDIT_EVENTS as readonly string[]).includes(entry));

				if (enabled.length === 0) {
					throw new UserFacingError(`None of those events exist. Valid events: ${AUDIT_EVENTS.join(", ")}.`);
				}

				await setAuditLogConfig(guild.id, channel.id, enabled);
				await reply(interaction, { embeds: [successEmbed(`Audit logging is enabled in ${channel}.`)] });
			},
		},
		{
			name: "disable",
			description: "Turn audit logging off.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await disableAuditLog(guild.id);
				if (!removed) throw new UserFacingError("Audit logging is not enabled here.");

				await reply(interaction, { embeds: [successEmbed("Audit logging has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the audit logging configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const config = await getAuditLogConfig(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: "Audit logging",
							description: config ? `Enabled in <#${config.channelId}>.` : "Disabled.",
							fields: [
								{
									name: "Logged events",
									value: config ? config.enabledLogs.join(", ") : "None",
								},
								{ name: "Available events", value: AUDIT_EVENTS.join(", ") },
							],
						}),
					],
				});
			},
		},
	],

	async run(interaction) {
		await reply(interaction, {
			content: "Pick a subcommand: `enable`, `disable` or `status`.",
			flags: MessageFlags.Ephemeral,
		});
	},
});
