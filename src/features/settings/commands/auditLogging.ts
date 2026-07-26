import { ChannelType, PermissionFlagsBits, StringSelectMenuOptionBuilder } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	disableAuditLog,
	getAuditLogConfig,
	setAuditLogConfig,
} from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { AUDIT_EVENTS } from "../services/auditLog";

export default defineCommand({
	name: "audit-logging",
	description: "Logs server events to a channel.",
	category: Category.Settings,
	surfaces: ["slash"],
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
					channelTypes: [ChannelType.GuildText],
				},
				{
					name: "events",
					description: "Comma-separated event names, or `all`.",
					type: "string",
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) throw new UserFacingError("Pick a text channel.");

				const raw = ctx.options.getString("events")?.trim().toLowerCase();
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
				await ctx.reply({ embeds: [successEmbed(`Audit logging is enabled in ${channel}.`)] });
			},
		},
		{
			name: "disable",
			description: "Turn audit logging off.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await disableAuditLog(guild.id);
				if (!removed) throw new UserFacingError("Audit logging is not enabled here.");

				await ctx.reply({ embeds: [successEmbed("Audit logging has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the audit logging configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const config = await getAuditLogConfig(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
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

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `enable`, `disable` or `status`.", ephemeral: true });
	},
});

export const AUDIT_EVENT_OPTIONS = AUDIT_EVENTS.map((event) =>
	new StringSelectMenuOptionBuilder().setLabel(event).setValue(event),
);
