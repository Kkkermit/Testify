import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { channelSelect, option, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text, withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { discordTime, escapeMarkdown, truncate } from "@lib/format/format.util";
import { SCHEDULE_PANEL_ID } from "@lib/scheduledMessages/scheduledMessages.constants";
import { REPEAT_LABELS } from "@lib/scheduledMessages/scheduledMessages.util";
import { settingsScreen, type ScreenAction, type ScreenRow } from "@lib/settings/settingsScreen.util";
import { SCHEDULE_LIMITS, type ScheduledMessage } from "@testify/shared";

type QuietPanel = ContainerMessage & { allowedMentions: { parse: [] } };

const flat = (value: string): string => value.replace(/\s+/g, " ");

/** A select option cannot show a timestamp, so it is written out in UTC there and nowhere else. */
function utc(iso: string): string {
	return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function when(iso: string): string {
	const at = new Date(iso);
	return `${discordTime(at, "f")} (${discordTime(at, "R")})`;
}

/** Every scheduled message in the server, soonest first, picked from one menu. */
export function scheduleHub(messages: readonly ScheduledMessage[], ownerId: string, note?: string): QuietPanel {
	const parts: ContainerPart[] = [
		text(
			`## ⏰ Scheduled messages\n${
				messages.length === 0
					? "None yet. Use `/schedule add` to post a message later, once or every day or week."
					: `${String(messages.length)} of ${String(SCHEDULE_LIMITS.maxPerGuild)}.`
			}`,
		),
	];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	if (messages.length > 0) {
		parts.push(
			divider(),
			text(
				messages
					.map(
						(entry, index) =>
							`${String(index + 1)}. <#${entry.channelId}> · ${when(entry.nextAt)} · ${REPEAT_LABELS[entry.repeat]}\n` +
							`-# ${escapeMarkdown(truncate(flat(entry.message), 80))}`,
					)
					.join("\n"),
			),
			row(
				select({
					id: customId(SCHEDULE_PANEL_ID, "open", ownerId),
					placeholder: "Choose one to change or delete…",
					options: messages.map((entry) =>
						option({
							label: truncate(flat(entry.message), 100),
							value: entry.id,
							description: `${REPEAT_LABELS[entry.repeat]} · next ${utc(entry.nextAt)}`,
						}),
					),
				}),
			),
		);
	}

	parts.push(text("-# Every post pings nobody, so a mention in it is shown but nobody is notified."));

	return withoutPings(containerMessage(container({ category: "settings", parts })));
}

export interface ScheduleEditorState {
	schedule: ScheduledMessage;
	note?: string;
	confirmingDelete?: boolean;
}

/** One scheduled message: where, when, how often and what it says, each applied on the press. */
export function scheduleEditor(state: ScheduleEditorState, ownerId: string): QuietPanel {
	const { schedule } = state;
	const args = [schedule.id];

	const rows: ScreenRow[] = [
		{ label: "Next post", value: when(schedule.nextAt), action: { action: "time", label: "Change", args } },
		{
			label: "Repeats",
			value: REPEAT_LABELS[schedule.repeat],
			action: { action: "repeat", label: "Change", args },
		},
		{ label: "Message", value: truncate(schedule.message, 1_000), action: { action: "edit", label: "Edit", args } },
	];
	if (!schedule.canSend) {
		rows.push({
			label: "⚠️ Cannot post",
			value: `I cannot post in <#${schedule.channelId}>, so this will be skipped. Give me Send Messages there, or move it.`,
		});
	}

	const actions: ScreenAction[] = state.confirmingDelete
		? [
				{ action: "delete-yes", label: "Delete it", style: ButtonStyle.Danger, args },
				{ action: "delete-no", label: "Keep it", args },
			]
		: [
				{ action: "delete", label: "Delete", style: ButtonStyle.Danger, args },
				{ action: "hub", label: "All scheduled messages" },
			];

	return withoutPings(
		settingsScreen({
			id: SCHEDULE_PANEL_ID,
			ownerId,
			category: "settings",
			title: "⏰ Scheduled message",
			status: state.confirmingDelete
				? "Delete this scheduled message? It will not be posted."
				: `Posts in <#${schedule.channelId}>. Every change applies the moment you make it.`,
			...(state.note !== undefined ? { note: state.note } : {}),
			rows,
			pickers: [
				{
					label: "Posted in",
					control: row(
						channelSelect({
							id: customId(SCHEDULE_PANEL_ID, "channel", schedule.id, ownerId),
							placeholder: "Channel to post in…",
							defaultChannelIds: [schedule.channelId],
						}),
					),
				},
			],
			actions,
		}),
	);
}
