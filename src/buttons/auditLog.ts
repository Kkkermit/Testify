import { type Guild } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { disableAuditLog, getAuditLogConfig, setAuditLogConfig } from "@database/repositories/settingsRepository";
import { AUDIT_EVENTS } from "@lib/auditLog.util";
import {
	AUDIT_PANEL_ID,
	type AuditDraft,
	type AuditPanelState,
	auditPanel,
	auditSavedPanel,
	collapseEnabled,
	decodeDraft,
	hasUnsavedChanges,
	isAuditEvent,
	resolveEnabled,
} from "@lib/auditPanel.util";

/** Every control on the audit logging panel. */
async function currentState(guildId: string): Promise<AuditPanelState> {
	const config = await getAuditLogConfig(guildId);
	return { channelId: config?.channelId ?? null, enabled: config?.enabledLogs ?? [] };
}

/** Checked when picked and again on Save, since a channel can be deleted between the two. */
async function requireSendable(guild: Guild, channelId: string): Promise<void> {
	const channel = await guild.channels.fetch(channelId).catch(() => null);

	if (!channel?.isTextBased() || !channel.isSendable()) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}
}

export default defineButton({
	id: AUDIT_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isMessageComponent()) return;

		const guild = interaction.guild;
		const userId = interaction.user.id;
		const saved = await currentState(guild.id);
		const draft = decodeDraft(context.args);

		const showEditor = async (next: AuditDraft): Promise<void> => {
			await interaction.update(
				auditPanel(
					{
						channelId: next.channelId,
						enabled: collapseEnabled(next.events),
						dirty: hasUnsavedChanges(saved, next),
					},
					userId,
				),
			);
		};

		switch (context.action) {
			case "channel": {
				if (!interaction.isChannelSelectMenu()) return;

				const [channelId] = interaction.values;
				if (channelId === undefined) return;
				await requireSendable(guild, channelId);

				// A first-time setup starts with everything ticked, which is what someone
				// enabling audit logging almost always wants.
				const fresh = saved.channelId === null && saved.enabled.length === 0 && draft.events.length === 0;
				await showEditor({ channelId, events: fresh ? [...AUDIT_EVENTS] : draft.events });
				return;
			}

			case "events": {
				if (!interaction.isStringSelectMenu()) return;
				if (draft.channelId === null) throw new UserFacingError("Choose a log channel first.");

				await showEditor({ channelId: draft.channelId, events: interaction.values.filter(isAuditEvent) });
				return;
			}

			case "all": {
				if (draft.channelId === null) throw new UserFacingError("Choose a log channel first.");

				await showEditor({ channelId: draft.channelId, events: [...AUDIT_EVENTS] });
				return;
			}

			case "none": {
				if (draft.channelId === null) throw new UserFacingError("Choose a log channel first.");

				await showEditor({ channelId: draft.channelId, events: [] });
				return;
			}

			case "save": {
				if (draft.channelId === null) throw new UserFacingError("Choose a log channel first.");
				await requireSendable(guild, draft.channelId);

				const enabled = collapseEnabled(draft.events);
				await setAuditLogConfig(guild.id, draft.channelId, enabled);

				await interaction.update(auditSavedPanel({ channelId: draft.channelId, enabled }, userId));
				return;
			}

			case "edit": {
				// Starts from what is stored rather than from whatever the confirmation
				// happened to be rendered with.
				await showEditor({ channelId: saved.channelId, events: resolveEnabled(saved.enabled) });
				return;
			}

			case "off": {
				await disableAuditLog(guild.id);
				await interaction.update(auditPanel({ channelId: null, enabled: [], dirty: false }, userId));
				return;
			}

			default:
				return;
		}
	},
});
