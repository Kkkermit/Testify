import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type StoredReminder } from "@database/repositories/reminderRepository";
import { button, navRow, row } from "@lib/discord/components.util";
import { container, containerMessage, sectionWithButton, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { REMINDER_ID, REMINDER_LIMITS } from "@lib/reminders/reminders.constants";

/** What `/remind` answers with, the list it keeps, and the message it delivers. */

const seconds = (date: Date): string => String(Math.floor(date.getTime() / 1_000));

export function quoted(value: string): string {
	return value
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

function shortened(value: string, limit: number): string {
	const line = value.replace(/\s+/g, " ");
	return line.length <= limit ? line : `${line.slice(0, limit - 1)}…`;
}

/** Whether it can ping here at all: only a reminder set in a server channel can. */
export function canPingHere(reminder: Pick<StoredReminder, "guildId" | "channelId">): boolean {
	return reminder.guildId !== null && reminder.channelId !== null;
}

export function whereLine(reminder: Pick<StoredReminder, "guildId" | "channelId" | "deliver">): string {
	return reminder.deliver === "dm" || !canPingHere(reminder)
		? "by direct message"
		: `with a ping in <#${reminder.channelId ?? ""}>`;
}

/** The private answer to `/remind me`, with a way to change where it arrives and to call it off. */
export function reminderConfirm(reminder: StoredReminder, ownerId: string, note?: string): ContainerMessage {
	const due = seconds(reminder.dueAt);
	const parts: ContainerPart[] = [
		text(`## ⏰ Reminder set\nI will remind you <t:${due}:R> (<t:${due}:f>), ${whereLine(reminder)}.`),
		text(quoted(reminder.text)),
	];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	const controls = [
		button({
			id: customId(REMINDER_ID, "cancel", reminder.id, ownerId),
			label: "Cancel it",
			style: ButtonStyle.Danger,
		}),
	];
	if (canPingHere(reminder)) {
		controls.unshift(
			button({
				id: customId(REMINDER_ID, "deliver", reminder.id, ownerId),
				label: reminder.deliver === "dm" ? "Ping me here instead" : "DM me instead",
			}),
		);
	}

	parts.push(row(...controls), text("-# `/remind list` shows every reminder you have."));
	return containerMessage(container({ category: "community", parts }));
}

export function reminderCancelled(reminder: Pick<StoredReminder, "text">): ContainerMessage {
	return containerMessage(
		container({ category: "community", parts: [text(`## ⏰ Reminder cancelled\n${quoted(reminder.text)}`)] }),
	);
}

export function pageCountOf(total: number): number {
	return Math.max(1, Math.ceil(total / REMINDER_LIMITS.perPage));
}

/** Every reminder a person has, soonest first, each with its own Cancel. */
export function reminderList(
	reminders: StoredReminder[],
	page: number,
	ownerId: string,
	note?: string,
): ContainerMessage {
	const pages = pageCountOf(reminders.length);
	const shown = Math.min(Math.max(0, page), pages - 1);
	const parts: ContainerPart[] = [
		text(
			`## ⏰ Your reminders\n${
				reminders.length === 0
					? "None. Set one with `/remind me`, such as `/remind me in:2h about:check the oven`."
					: `${String(reminders.length)} of ${String(REMINDER_LIMITS.maxActive)}, soonest first.`
			}`,
		),
	];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	const start = shown * REMINDER_LIMITS.perPage;
	for (const reminder of reminders.slice(start, start + REMINDER_LIMITS.perPage)) {
		parts.push(
			sectionWithButton(
				`**<t:${seconds(reminder.dueAt)}:R>** · ${whereLine(reminder)}\n${shortened(reminder.text, 120)}`,
				button({ id: customId(REMINDER_ID, "drop", reminder.id, shown, ownerId), label: "Cancel" }),
			),
		);
	}

	if (pages > 1) parts.push(navRow(REMINDER_ID, shown, pages, ownerId));

	return containerMessage(container({ category: "community", parts }));
}

/** The delivered reminder; only a channel post mentions anybody, and it mentions only its owner. */
export function deliveredText(reminder: StoredReminder, where: "channel" | "dm"): string {
	const set = `<t:${seconds(reminder.createdAt)}:R>`;
	const lines = [
		where === "channel"
			? `⏰ <@${reminder.userId}>, you asked me to remind you ${set}:`
			: `⏰ You asked me to remind you ${set}:`,
		quoted(reminder.text),
	];

	if (where === "dm" && reminder.guildId !== null && reminder.channelId !== null) {
		lines.push(`-# Set in https://discord.com/channels/${reminder.guildId}/${reminder.channelId}`);
	}

	return lines.join("\n");
}
