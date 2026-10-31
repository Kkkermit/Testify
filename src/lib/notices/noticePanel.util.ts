import { ButtonStyle, type EmbedBuilder } from "discord.js";
import { botName } from "@core/brand";
import { customId } from "@core/button";
import { button, option, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text, withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { embed } from "@lib/discord/embeds.util";
import { escapeMarkdown, truncate } from "@lib/format/format.util";
import { NOTICE_PANEL_ID } from "@lib/notices/notices.constants";
import { settingsScreen, type ScreenAction } from "@lib/settings/settingsScreen.util";
import { isScheduled, type Notice, NOTICE_LIMITS, NOTICE_TONES, type NoticeTone } from "@testify/shared";

type QuietPanel = ContainerMessage & { allowedMentions: { parse: [] } };

export const NOTICE_TONE_LOOK: Record<NoticeTone, { emoji: string; label: string }> = {
	info: { emoji: "📣", label: "Notice" },
	problem: { emoji: "⚠️", label: "Problem" },
	fixed: { emoji: "✅", label: "Fixed" },
};

/** An edit within this long of posting is the same moment, not an edit worth mentioning. */
const EDIT_GRACE_MS = 60_000;

export function nextTone(tone: NoticeTone): NoticeTone {
	return NOTICE_TONES[(NOTICE_TONES.indexOf(tone) + 1) % NOTICE_TONES.length] ?? "info";
}

function stamp(iso: string, style: "R" | "f" = "R"): string {
	return `<t:${String(Math.floor(Date.parse(iso) / 1_000))}:${style}>`;
}

const fullStamp = (iso: string): string => `${stamp(iso, "f")} (${stamp(iso)})`;

function noticeText(notice: Notice, now: Date): string {
	const look = NOTICE_TONE_LOOK[notice.tone];
	const edited = Date.parse(notice.updatedAt) - Date.parse(notice.publishedAt) > EDIT_GRACE_MS;
	const when = isScheduled(notice, now)
		? `⏳ goes up ${stamp(notice.publishedAt)}`
		: `posted ${stamp(notice.publishedAt)}${edited ? ` · edited ${stamp(notice.updatedAt)}` : ""}`;
	const ends = notice.endsAt === null ? "" : ` · comes down ${stamp(notice.endsAt)}`;

	return [`### ${look.emoji} ${escapeMarkdown(notice.title)}`, notice.body, `-# ${look.label} · ${when}${ends}`].join(
		"\n",
	);
}

/** Every notification, newest first; one of the bot's owners also gets the controls, so `ownerId` is null for anybody else. */
export function noticeBoard(
	notices: readonly Notice[],
	ownerId: string | null,
	note?: string,
	now = new Date(),
): QuietPanel {
	const parts: ContainerPart[] = [text(`## 📣 Bot notifications\n-# From the people who run ${botName()}.`)];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	if (notices.length === 0) {
		parts.push(
			text(
				ownerId === null
					? "Nothing to tell you right now."
					: "Nothing is up. Post one, and everybody who uses the bot is told about it the next time they run a command or open the dashboard.",
			),
		);
	}
	for (const notice of notices) parts.push(divider(), text(noticeText(notice, now)));

	if (ownerId !== null) {
		const full = notices.length >= NOTICE_LIMITS.maxActive;
		parts.push(divider());

		if (notices.length > 0) {
			parts.push(
				row(
					select({
						id: customId(NOTICE_PANEL_ID, "open", ownerId),
						placeholder: "Choose one to change or remove…",
						options: notices.map((notice) =>
							option({
								label: truncate(notice.title, 100),
								value: notice.id,
								description: truncate(
									`${isScheduled(notice, now) ? "Goes up later · " : ""}${notice.body.replace(/\s+/g, " ")}`,
									100,
								),
								emoji: NOTICE_TONE_LOOK[notice.tone].emoji,
							}),
						),
					}),
				),
			);
		}

		parts.push(
			row(
				...NOTICE_TONES.map((tone) =>
					button({
						id: customId(NOTICE_PANEL_ID, "new", tone, ownerId),
						label: `Post: ${NOTICE_TONE_LOOK[tone].label}`,
						emoji: NOTICE_TONE_LOOK[tone].emoji,
						style: tone === "info" ? ButtonStyle.Success : ButtonStyle.Secondary,
						disabled: full,
					}),
				),
			),
			text(
				full
					? `-# ${String(NOTICE_LIMITS.maxActive)} is as many as can be up at once. Remove one to post another.`
					: "-# Only the bot's owners see these controls. A new notification is mentioned once to everybody, after their next command and on the dashboard.",
			),
		);
	}

	return withoutPings(containerMessage(container({ category: "info", parts })));
}

export interface NoticeEditorState {
	notice: Notice;
	note?: string;
	confirmingRemove?: boolean;
}

/** One notification, for the bot's owners: its words, its kind and when it goes up and comes down, each applied on the press. */
export function noticeEditor(state: NoticeEditorState, ownerId: string, now = new Date()): QuietPanel {
	const { notice } = state;
	const args = [notice.id];
	const look = NOTICE_TONE_LOOK[notice.tone];
	const waiting = isScheduled(notice, now);

	const actions: ScreenAction[] = state.confirmingRemove
		? [
				{ action: "remove-yes", label: "Remove it", style: ButtonStyle.Danger, args },
				{ action: "remove-no", label: "Keep it", args },
			]
		: [
				waiting
					? { action: "again", label: "Post now", emoji: "📣", style: ButtonStyle.Success, args }
					: { action: "again", label: "Tell everybody again", emoji: "🔔", args },
				{ action: "remove", label: "Remove", style: ButtonStyle.Danger, args },
				{ action: "board", label: "All notifications" },
			];

	return withoutPings(
		settingsScreen({
			id: NOTICE_PANEL_ID,
			ownerId,
			category: "info",
			title: "📣 Notification",
			status: state.confirmingRemove
				? "Remove this notification? Nobody sees it after this."
				: "Every change applies the moment you make it. Changing the words tells nobody again.",
			...(state.note !== undefined ? { note: state.note } : {}),
			rows: [
				{ label: "Title", value: escapeMarkdown(notice.title), action: { action: "edit", label: "Edit", args } },
				{
					label: "Kind",
					value: `${look.emoji} ${look.label}`,
					action: { action: "tone", label: "Change", args },
				},
				{ label: "Message", value: notice.body },
				waiting
					? {
							label: "Goes up",
							value: fullStamp(notice.publishedAt),
							action: { action: "start", label: "Change", args },
						}
					: { label: "Went up", value: stamp(notice.publishedAt) },
				{
					label: "Comes down",
					value: notice.endsAt === null ? "When it is removed" : fullStamp(notice.endsAt),
					action: { action: "end", label: "Change", args },
				},
			],
			actions,
		}),
	);
}

/** Said once after somebody's command, for each notification new to them. */
export function noticeHint(unread: number, command: string): EmbedBuilder {
	const what = unread === 1 ? "is 1 new notification" : `are ${String(unread)} new notifications`;

	return embed({
		category: "info",
		description: `📣 There ${what} from the people who run ${botName()}. Run \`${command}\` to read ${unread === 1 ? "it" : "them"}.`,
	});
}
