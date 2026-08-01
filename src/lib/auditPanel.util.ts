import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, channelSelect, option, row, select, selectRow } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	text,
} from "@lib/containers.util";
import {
	AUDIT_EVENT_LABELS,
	AUDIT_EVENTS,
	type AuditEvent,
	collapseEnabled,
	isAuditEvent,
	resolveEnabled,
} from "@testify/shared";

/** Audit logging, as a panel you click rather than a list you type. */

export const AUDIT_PANEL_ID = "audit";

/** Stands in for "no channel yet", because a custom ID part cannot be empty. */
const NO_CHANNEL = "-";

export { collapseEnabled, isAuditEvent, resolveEnabled };

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

/**
 * Eighteen event names do not fit in Discord's 100 characters, but eighteen bits do: one bit per event at its index
 * in `AUDIT_EVENTS`, written in base 36.
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

/** Whether Save has anything to do. */
export function hasUnsavedChanges(saved: AuditPanelState, draft: AuditDraft): boolean {
	if (saved.channelId !== draft.channelId) return true;

	const stored = resolveEnabled(saved.enabled);
	return stored.length !== draft.events.length || draft.events.some((event) => !stored.includes(event));
}

function labelsOf(events: AuditEvent[]): string {
	return events.map((event) => AUDIT_EVENT_LABELS[event].label).join(", ");
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
								label: AUDIT_EVENT_LABELS[event].label,
								value: event,
								description: AUDIT_EVENT_LABELS[event].describes,
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
