import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { getAuditLogConfig } from "@database/repositories/settingsRepository";
import { auditPanel } from "@lib/auditPanel.util";
import { dashboardHint } from "@lib/dashboard.util";
import { reply } from "@lib/reply.util";

/** One panel instead of three subcommands. */
export default defineCommand({
	name: "audit-logging",
	description: "Chooses which server events get logged, and where.",
	category: "settings",
	aliases: ["auditlog", "logging"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],

	async run(interaction, client) {
		const guild = inGuild(interaction);
		const config = await getAuditLogConfig(guild.id);

		await reply(
			interaction,
			auditPanel(
				{
					channelId: config?.channelId ?? null,
					enabled: config?.enabledLogs ?? [],
					hint: dashboardHint(client.env, `/guilds/${guild.id}/audit-log`),
				},
				interaction.user.id,
			),
		);
	},
});
