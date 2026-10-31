import { MessageFlags } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage, modalForm } from "@lib/discord";
import { parseDuration } from "@lib/format";
import {
	allNotices,
	changeNotice,
	nextTone,
	NOTICE_PANEL_ID,
	noticeBoard,
	noticeEditor,
	postNotice,
	readNotice,
	removeNotice,
} from "@lib/notices";
import { isScheduled, type Notice, NOTICE_LIMITS, NOTICE_TONES, type NoticeTone } from "@testify/shared";

/** The bot's owners' controls on `/bot-notifications`: post, change and remove what everybody is told. */

async function show(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	// A modal opened elsewhere cannot edit this message, so it answers privately instead.
	if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
		await interaction.update(panel);
	}
}

const KEEP_PLACEHOLDER = "Blank keeps it up until you remove it. Or 6h, 3d";
const START_PLACEHOLDER = "Blank posts it now. Or 30m, 2h, 1d";

function noticeForm(action: string, args: string[], notice?: Notice): ReturnType<typeof modalForm> {
	const timing =
		notice === undefined
			? [
					{ id: "start", label: "Put it up in", required: false, placeholder: START_PLACEHOLDER },
					{ id: "keep", label: "Keep it up for", required: false, placeholder: KEEP_PLACEHOLDER },
				]
			: [];

	return modalForm({
		id: NOTICE_PANEL_ID,
		action,
		args,
		title: notice === undefined ? "New notification" : "Notification",
		fields: [
			{
				id: "title",
				label: "Title",
				maxLength: NOTICE_LIMITS.maxTitle,
				placeholder: "Music is down for now",
				value: notice?.title ?? "",
			},
			{
				id: "body",
				label: "What everybody should know",
				paragraph: true,
				maxLength: NOTICE_LIMITS.maxBody,
				placeholder: "YouTube is refusing the bot. SoundCloud still plays while it is looked into.",
				value: notice?.body ?? "",
			},
			...timing,
		],
	});
}

function timeForm(
	action: string,
	args: string[],
	field: { label: string; placeholder: string },
): ReturnType<typeof modalForm> {
	return modalForm({
		id: NOTICE_PANEL_ID,
		action,
		args,
		title: "Notification",
		fields: [{ id: "time", required: false, ...field }],
	});
}

/** Null for a blank field; a length of time nobody could read is refused by the field's own name. */
function typedLength(interaction: ComponentInteraction, id: string, label: string): number | null {
	if (!interaction.isModalSubmit()) throw new UserFacingError("Open the form again and fill it in.");
	const value = interaction.fields.getTextInputValue(id).trim();
	if (value === "") return null;

	const ms = parseDuration(value);
	if (ms === null) {
		throw new UserFacingError(
			`**${label}** takes a length of time, like \`30m\`, \`2h\` or \`3d\`, or can be left blank.`,
		);
	}
	return ms;
}

const isoAfter = (from: number, ms: number): string => new Date(from + ms).toISOString();

/** Counted from when it goes up while it waits, and from now once it is up. */
const endLabel = (waiting: boolean): string => (waiting ? "Keep it up for, once it goes up" : "Take it down in");

const relative = (iso: string): string => `<t:${String(Math.floor(Date.parse(iso) / 1_000))}:R>`;

function typed(interaction: ComponentInteraction): { title: string; body: string } {
	if (!interaction.isModalSubmit()) throw new UserFacingError("Open the form again and fill it in.");
	return { title: interaction.fields.getTextInputValue("title"), body: interaction.fields.getTextInputValue("body") };
}

function toneOf(value: string | undefined): NoticeTone {
	return NOTICE_TONES.find((tone) => tone === value) ?? "info";
}

export default defineButton({
	id: NOTICE_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		// The panel is private to whoever ran it, and ownership is read from the env on every press as well.
		if (!context.client.isOwner(interaction.user.id)) {
			throw new UserFacingError("Only the bot's owners can change its notifications.");
		}

		const ownerId = interaction.user.id;
		const [first = ""] = context.args;
		const board = async (note?: string): Promise<void> =>
			show(interaction, noticeBoard(await allNotices(), ownerId, note));
		const editor = async (notice: Notice, note?: string): Promise<void> =>
			show(interaction, noticeEditor({ notice, ...(note === undefined ? {} : { note }) }, ownerId));

		switch (context.action) {
			case "new":
				if (interaction.isButton()) await interaction.showModal(noticeForm("create", [toneOf(first), ownerId]));
				return;

			case "create": {
				const now = Date.now();
				const startIn = typedLength(interaction, "start", "Put it up in");
				const keepFor = typedLength(interaction, "keep", "Keep it up for");
				const startsAt = startIn === null ? now : now + startIn;
				const notice = await postNotice(
					{
						...typed(interaction),
						tone: toneOf(first),
						...(startIn === null ? {} : { startsAt: isoAfter(now, startIn) }),
						endsAt: keepFor === null ? null : isoAfter(startsAt, keepFor),
					},
					ownerId,
					new Date(now),
				);
				await board(
					startIn === null
						? "Posted. Everybody is told about it after their next command, and on the dashboard."
						: `Scheduled. It goes up ${relative(notice.publishedAt)}, and everybody is told after their next command from then.`,
				);
				return;
			}

			case "open":
				if (interaction.isStringSelectMenu()) await editor(await readNotice(interaction.values[0] ?? ""));
				return;

			case "edit":
				if (interaction.isButton()) {
					await interaction.showModal(noticeForm("save", [first, ownerId], await readNotice(first)));
				}
				return;

			case "save":
				await editor(await changeNotice(first, typed(interaction)), "Saved.");
				return;

			case "tone":
				await editor(await changeNotice(first, { tone: nextTone((await readNotice(first)).tone) }));
				return;

			case "again": {
				const waiting = isScheduled(await readNotice(first), new Date());
				await editor(
					await changeNotice(first, { notifyAgain: true }),
					waiting
						? "Posted. Everybody is told about it after their next command."
						: "Everybody is told about it again after their next command.",
				);
				return;
			}

			case "start":
				if (interaction.isButton()) {
					await interaction.showModal(
						timeForm("start-save", [first, ownerId], { label: "Put it up in", placeholder: START_PLACEHOLDER }),
					);
				}
				return;

			case "start-save": {
				const now = Date.now();
				const startIn = typedLength(interaction, "time", "Put it up in");
				await editor(
					await changeNotice(
						first,
						startIn === null ? { notifyAgain: true } : { startsAt: isoAfter(now, startIn) },
						new Date(now),
					),
					startIn === null ? "Posted. Everybody is told about it after their next command." : "Moved.",
				);
				return;
			}

			case "end":
				if (interaction.isButton()) {
					const label = endLabel(isScheduled(await readNotice(first), new Date()));
					await interaction.showModal(timeForm("end-save", [first, ownerId], { label, placeholder: KEEP_PLACEHOLDER }));
				}
				return;

			case "end-save": {
				const now = Date.now();
				const current = await readNotice(first);
				const waiting = isScheduled(current, new Date(now));
				const keepFor = typedLength(interaction, "time", endLabel(waiting));
				const from = waiting ? Date.parse(current.publishedAt) : now;
				await editor(
					await changeNotice(first, { endsAt: keepFor === null ? null : isoAfter(from, keepFor) }, new Date(now)),
					keepFor === null ? "It stays up until you remove it." : "Saved.",
				);
				return;
			}

			case "remove":
			case "remove-no":
				await show(
					interaction,
					noticeEditor({ notice: await readNotice(first), confirmingRemove: context.action === "remove" }, ownerId),
				);
				return;

			case "remove-yes":
				await removeNotice(first);
				await board("Removed. Nobody sees it any more.");
				return;

			case "board":
				await board();
				return;
		}
	},
});
