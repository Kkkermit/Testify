import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { AUDIT_EVENTS, type AuditEvent } from "@lib/auditLog.util";
import { button, channelSelect, option, row, select, selectRow } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	text,
} from "@lib/containers.util";

/**
 * Audit logging, as a panel you click rather than a list you type.
 *
 * `/audit-logging enable` used to take a comma-separated string of event names,
 * which meant knowing all eighteen of them and spelling each one correctly — a
 * typo silently dropped that event. The old JS bot had a select menu for this and
 * it was the better design.
 *
 * Editing is a draft: the menus and buttons change what the panel shows, and
 * nothing reaches the database until Save is pressed. `auditSavedPanel` is what
 * Save renders, and it is the only view that can promise what it shows is what the
 * bot will actually do.
 */

export const AUDIT_PANEL_ID = "audit";

/** Stands in for "no channel yet", because a custom ID part cannot be empty. */
const NO_CHANNEL = "-";

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
	/** True when the panel is showing edits that are not in the database yet. */
	dirty?: boolean;
}

/** What the admin has picked in one message, before Save writes it. */
export interface AuditDraft {
	channelId: string | null;
	events: AuditEvent[];
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

/**
 * Eighteen event names do not fit in Discord's 100 characters, but eighteen bits
 * do: one bit per event at its index in `AUDIT_EVENTS`, written in base 36.
 *
 * The mask only ever travels in a live message's custom IDs — the database still
 * stores names — so reordering `AUDIT_EVENTS` can at worst misread a panel someone
 * left open across a deploy.
 */
export function encodeEvents(events: AuditEvent[]): string {
	let mask = 0;
	for (const event of events) mask |= 1 << AUDIT_EVENTS.indexOf(event);
	return mask.toString(36);
}

export function decodeEvents(token: string): AuditEvent[] {
	const mask = Number.parseInt(token, 36);
	if (Number.isNaN(mask) || mask <= 0) return [];

	return AUDIT_EVENTS.filter((_, index) => (mask & (1 << index)) !== 0);
}

/** Reads a draft back out of a custom ID's arguments. */
export function decodeDraft(args: string[]): AuditDraft {
	const [channelId = NO_CHANNEL, events = "0"] = args;
	return { channelId: channelId === NO_CHANNEL ? null : channelId, events: decodeEvents(events) };
}

/**
 * Whether Save has anything to do. Compared against the expanded list, so a stored
 * `all` and a fully ticked menu count as the same thing rather than as a change.
 */
export function hasUnsavedChanges(saved: AuditPanelState, draft: AuditDraft): boolean {
	if (saved.channelId !== draft.channelId) return true;

	const stored = resolveEnabled(saved.enabled);
	return stored.length !== draft.events.length || draft.events.some((event) => !stored.includes(event));
}

function labelsOf(events: AuditEvent[]): string {
	return events.map((event) => EVENT_LABELS[event].label).join(", ");
}

/** Every control carries the draft, so the next interaction knows what is on screen. */
function controlId(action: string, state: AuditPanelState, ownerId: string): string {
	const events = encodeEvents(resolveEnabled(state.enabled));
	return customId(AUDIT_PANEL_ID, action, state.channelId ?? NO_CHANNEL, events, ownerId);
}

function summary(state: AuditPanelState): string {
	if (state.channelId === null) {
		return (
			"## 📋 Audit logging\n" +
			"Pick a channel below to start logging server events.\n" +
			`-# ${AUDIT_EVENTS.length} event types available`
		);
	}

	const active = resolveEnabled(state.enabled);
	const scope = state.enabled.includes("all") ? "**every event**" : `**${active.length}** of ${AUDIT_EVENTS.length}`;

	if (state.dirty === true) {
		return (
			"## 📋 Audit logging\n" +
			`Ready to log ${scope} to <#${state.channelId}>.\n` +
			"-# ⚠️ Nothing is saved yet — press **Save** to apply these changes."
		);
	}

	return (
		"## 📋 Audit logging\n" +
		`Logging ${scope} to <#${state.channelId}>.\n` +
		(active.length === 0 ? "-# ⚠️ No events selected, so nothing will be logged." : `-# ${labelsOf(active)}`)
	);
}

export function auditPanel(state: AuditPanelState, ownerId: string): ContainerMessage {
	const active = resolveEnabled(state.enabled);
	const noChannel = state.channelId === null;

	return containerMessage(
		container({
			category: "settings",
			parts: [
				text(summary(state)),
				divider(),
				row(
					channelSelect({
						id: controlId("channel", state, ownerId),
						placeholder: noChannel ? "Choose a log channel…" : "Move the log somewhere else…",
					}),
				),
				selectRow(
					select({
						id: controlId("events", state, ownerId),
						placeholder: "Choose which events to log…",
						// Zero is a legitimate choice — it means "log nothing for now"
						// without losing the configured channel.
						minValues: 0,
						maxValues: AUDIT_EVENTS.length,
						disabled: noChannel,
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
						id: controlId("save", state, ownerId),
						label: "Save",
						style: ButtonStyle.Success,
						disabled: noChannel || state.dirty !== true,
					}),
					button({
						id: controlId("all", state, ownerId),
						label: "Log everything",
						disabled: noChannel || active.length === AUDIT_EVENTS.length,
					}),
					button({
						id: controlId("none", state, ownerId),
						label: "Clear selection",
						disabled: noChannel || active.length === 0,
					}),
					button({
						id: controlId("off", state, ownerId),
						label: "Turn off",
						style: ButtonStyle.Danger,
						disabled: noChannel,
					}),
				),
			],
		}),
	);
}

/** What Save renders: the configuration as written, with nothing still pending. */
export function auditSavedPanel(state: AuditPanelState, ownerId: string): ContainerMessage {
	const active = resolveEnabled(state.enabled);
	const scope = state.enabled.includes("all")
		? "**every event**"
		: `**${active.length}** of ${AUDIT_EVENTS.length} event types`;

	const parts: ContainerPart[] =
		active.length === 0
			? [
					text(
						"## ⚠️ Audit logging saved, but silent\n" +
							`No events are selected, so nothing will be logged to <#${state.channelId}>.\n` +
							"-# Press Edit to pick some, or Turn off to stop logging altogether.",
					),
				]
			: [
					text(`## ✅ Audit logging is active\nSending ${scope} to <#${state.channelId}>.`),
					divider(),
					text(`**Now logging**\n${labelsOf(active)}`),
				];

	parts.push(
		divider(),
		row(
			button({ id: controlId("edit", state, ownerId), label: "Edit", style: ButtonStyle.Primary }),
			button({ id: controlId("off", state, ownerId), label: "Turn off", style: ButtonStyle.Danger }),
		),
	);

	return containerMessage(container({ category: "settings", parts }));
}
