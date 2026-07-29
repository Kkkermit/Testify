import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { AUDIT_EVENTS, type AuditEvent } from "@lib/auditLog.util";
import { button, channelSelect, option, row, select, selectRow } from "@lib/components.util";
import { container, type ContainerMessage, containerMessage, divider, text } from "@lib/containers.util";

/**
 * Audit logging, as a panel you click rather than a list you type.
 *
 * `/audit-logging enable` used to take a comma-separated string of event names,
 * which meant knowing all eighteen of them and spelling each one correctly — a
 * typo silently dropped that event. The old JS bot had a select menu for this and
 * it was the better design.
 *
 * The current configuration is read from the database on every render rather than
 * carried in the custom ID: eighteen event names cannot fit in Discord's
 * 100-character limit, and re-reading is what keeps two admins editing at once
 * from overwriting each other with stale state.
 */

export const AUDIT_PANEL_ID = "audit";

/** Human labels, so the menu does not read like a list of gateway constants. */
const EVENT_LABELS: Record<AuditEvent, { label: string; description: string }> = {
	messageDelete: { label: "Message deleted", description: "Someone's message was removed" },
	messageUpdate: { label: "Message edited", description: "A message was changed" },
	channelCreate: { label: "Channel created", description: "A new channel appeared" },
	channelDelete: { label: "Channel deleted", description: "A channel was removed" },
	channelUpdate: { label: "Channel updated", description: "A channel was renamed or reconfigured" },
	roleCreate: { label: "Role created", description: "A new role was added" },
	roleDelete: { label: "Role deleted", description: "A role was removed" },
	roleUpdate: { label: "Role updated", description: "A role's name, colour or permissions changed" },
	memberJoin: { label: "Member joined", description: "Someone joined the server" },
	memberLeave: { label: "Member left", description: "Someone left or was removed" },
	memberUpdate: { label: "Member updated", description: "Nickname or roles changed" },
	banAdd: { label: "Member banned", description: "Someone was banned" },
	banRemove: { label: "Member unbanned", description: "A ban was lifted" },
	emojiUpdate: { label: "Emoji changed", description: "Server emoji were added or removed" },
	guildUpdate: { label: "Server updated", description: "Server settings changed" },
	inviteUpdate: { label: "Invites changed", description: "An invite was created or deleted" },
	threadUpdate: { label: "Threads changed", description: "A thread was created, archived or deleted" },
	voiceUpdate: { label: "Voice activity", description: "Members joining or leaving voice channels" },
};

export interface AuditPanelState {
	channelId: string | null;
	/** `["all"]` means every event, which is how the config has always stored it. */
	enabled: string[];
}

export function isAuditEvent(value: string): value is AuditEvent {
	return (AUDIT_EVENTS as readonly string[]).includes(value);
}

/** Expands the stored `all` shorthand so the menu can tick each option. */
export function resolveEnabled(enabled: string[]): AuditEvent[] {
	if (enabled.includes("all")) return [...AUDIT_EVENTS];
	return enabled.filter(isAuditEvent);
}

/**
 * Collapses a full selection back to `all`, so a guild that ticks everything keeps
 * logging events added in a later release rather than being frozen at today's list.
 */
export function collapseEnabled(events: AuditEvent[]): string[] {
	return events.length === AUDIT_EVENTS.length ? ["all"] : events;
}

function summary(state: AuditPanelState): string {
	const active = resolveEnabled(state.enabled);

	if (state.channelId === null) {
		return (
			"## 📋 Audit logging\n" +
			"Pick a channel below to start logging server events.\n" +
			`-# ${AUDIT_EVENTS.length} event types available`
		);
	}

	const scope = state.enabled.includes("all") ? "**every event**" : `**${active.length}** of ${AUDIT_EVENTS.length}`;

	return (
		"## 📋 Audit logging\n" +
		`Logging ${scope} to <#${state.channelId}>.\n` +
		(active.length === 0 ? "-# ⚠️ No events selected, so nothing will be logged." : `-# ${active.join(", ")}`)
	);
}

export function auditPanel(state: AuditPanelState, ownerId: string): ContainerMessage {
	const active = resolveEnabled(state.enabled);
	const everything = active.length === AUDIT_EVENTS.length;

	return containerMessage(
		container({
			category: "settings",
			parts: [
				text(summary(state)),
				divider(),
				row(
					channelSelect({
						id: customId(AUDIT_PANEL_ID, "channel", ownerId),
						placeholder: state.channelId === null ? "Choose a log channel…" : "Move the log somewhere else…",
					}),
				),
				selectRow(
					select({
						id: customId(AUDIT_PANEL_ID, "events", ownerId),
						placeholder: "Choose which events to log…",
						// Zero is a legitimate choice — it means "log nothing for now"
						// without losing the configured channel.
						minValues: 0,
						maxValues: AUDIT_EVENTS.length,
						disabled: state.channelId === null,
						options: AUDIT_EVENTS.map((event) =>
							option({
								label: EVENT_LABELS[event].label,
								value: event,
								description: EVENT_LABELS[event].description,
								selected: active.includes(event),
							}),
						),
					}),
				),
				row(
					button({
						id: customId(AUDIT_PANEL_ID, "all", ownerId),
						label: "Log everything",
						style: ButtonStyle.Success,
						disabled: state.channelId === null || everything,
					}),
					button({
						id: customId(AUDIT_PANEL_ID, "none", ownerId),
						label: "Clear selection",
						disabled: state.channelId === null || active.length === 0,
					}),
					button({
						id: customId(AUDIT_PANEL_ID, "off", ownerId),
						label: "Turn off",
						style: ButtonStyle.Danger,
						disabled: state.channelId === null,
					}),
				),
			],
		}),
	);
}
