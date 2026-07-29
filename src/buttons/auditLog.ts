import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { disableAuditLog, getAuditLogConfig, setAuditLogConfig } from "@database/repositories/settingsRepository";
import { AUDIT_EVENTS } from "@lib/auditLog.util";
import {
	AUDIT_PANEL_ID,
	type AuditPanelState,
	auditPanel,
	collapseEnabled,
	isAuditEvent,
	resolveEnabled,
} from "@lib/auditPanel.util";

/**
 * Every control on the audit logging panel.
 *
 * The configuration is re-read before each change rather than trusted from the
 * message, so two admins with the panel open cannot overwrite each other with a
 * stale selection.
 */
async function currentState(guildId: string): Promise<AuditPanelState> {
	const config = await getAuditLogConfig(guildId);
	return { channelId: config?.channelId ?? null, enabled: config?.enabledLogs ?? [] };
}

export default defineButton({
	id: AUDIT_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isMessageComponent()) return;

		const guildId = interaction.guild.id;
		const userId = interaction.user.id;
		const state = await currentState(guildId);

		switch (context.action) {
			case "channel": {
				if (!interaction.isChannelSelectMenu()) return;

				const [channelId] = interaction.values;
				if (channelId === undefined) return;

				const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
				}

				// Choosing a channel for the first time turns everything on, which is
				// what someone enabling audit logging almost always wants.
				const enabled = state.channelId === null && state.enabled.length === 0 ? ["all"] : state.enabled;
				await setAuditLogConfig(guildId, channelId, enabled);

				await interaction.update(auditPanel({ channelId, enabled }, userId));
				return;
			}

			case "events": {
				if (!interaction.isStringSelectMenu()) return;
				if (state.channelId === null) throw new UserFacingError("Choose a log channel first.");

				const chosen = interaction.values.filter(isAuditEvent);
				const enabled = collapseEnabled(chosen);

				await setAuditLogConfig(guildId, state.channelId, enabled);
				await interaction.update(auditPanel({ channelId: state.channelId, enabled }, userId));
				return;
			}

			case "all": {
				if (state.channelId === null) throw new UserFacingError("Choose a log channel first.");

				await setAuditLogConfig(guildId, state.channelId, ["all"]);
				await interaction.update(auditPanel({ channelId: state.channelId, enabled: ["all"] }, userId));
				return;
			}

			case "none": {
				if (state.channelId === null) throw new UserFacingError("Choose a log channel first.");

				await setAuditLogConfig(guildId, state.channelId, []);
				await interaction.update(auditPanel({ channelId: state.channelId, enabled: [] }, userId));
				return;
			}

			case "off": {
				await disableAuditLog(guildId);
				await interaction.update(auditPanel({ channelId: null, enabled: [] }, userId));
				return;
			}

			default:
				return;
		}
	},
});

/** Re-exported so the command and the handler cannot drift on what counts as valid. */
export { AUDIT_EVENTS, resolveEnabled };
