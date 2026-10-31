import { MessageFlags } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage, modalForm } from "@lib/discord";
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
import { type Notice, NOTICE_LIMITS, NOTICE_TONES, type NoticeTone } from "@testify/shared";

/** The bot's owners' controls on `/bot-notifications`: post, change and remove what everybody is told. */

async function show(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	// A modal opened elsewhere cannot edit this message, so it answers privately instead.
	if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
		await interaction.update(panel);
	}
}

function noticeForm(action: string, args: string[], notice?: Notice): ReturnType<typeof modalForm> {
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
		],
	});
}

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

			case "create":
				await postNotice({ ...typed(interaction), tone: toneOf(first) }, ownerId);
				await board("Posted. Everybody is told about it after their next command, and on the dashboard.");
				return;

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

			case "again":
				await editor(
					await changeNotice(first, { notifyAgain: true }),
					"Everybody is told about it again after their next command.",
				);
				return;

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
