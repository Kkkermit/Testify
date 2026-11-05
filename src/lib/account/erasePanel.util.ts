import {
	ButtonStyle,
	LabelBuilder,
	ModalBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { theme } from "@config/theme";
import { botName } from "@core/brand";
import { customId } from "@core/button";
import { ERASE_CONFIRM_FIELD, ERASE_PANEL_ID } from "@lib/account/account.constants";
import { button, row } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";

/** What deleting removes and keeps, then Cancel and Delete; `notice` sits on top, such as a confirmation that did not match. */
export function erasePanel(userId: string, notice?: string): ContainerMessage {
	const parts: ContainerPart[] = [];
	if (notice !== undefined) parts.push(text(`-# ${theme.emoji.warning} ${notice}`));

	parts.push(
		text(
			`## 🗑️ Delete my data\nThis deletes everything ${botName()} keeps about you, in every server, straight away. **It can’t be undone, and there is no way to bring it back.**`,
		),
		divider(),
		text(
			[
				"### What goes",
				"- Your wallet, bank, items and pets, your casino records, your levels and XP, and your lottery tickets.",
				"- Your birthdays, reminders, away notes and profile, the ideas you posted and their posts, and your votes on other ideas.",
				`- The commands you ran, how many messages you sent each day, when you joined or left, the messages you sent ${botName()} directly, and every dashboard sign-in.`,
			].join("\n"),
		),
		text(
			[
				"### What stays",
				"- Warnings, cases, softbans and blocks against you, or anybody could wipe their own record.",
				"- Anything you did for a server, such as a case you opened or a setting you changed, with your name taken off.",
			].join("\n"),
		),
		divider(),
		row(
			button({ id: customId(ERASE_PANEL_ID, "cancel", userId), label: "Cancel", style: ButtonStyle.Secondary }),
			button({ id: customId(ERASE_PANEL_ID, "confirm", userId), label: "Delete", style: ButtonStyle.Danger }),
		),
	);

	return containerMessage(container({ accent: theme.colours.error, parts }));
}

export function eraseCancelled(): ContainerMessage {
	return containerMessage(
		container({
			category: "info",
			parts: [
				text("## Nothing was deleted\nYour data is just as it was. Run `/delete-my-data` again whenever you want."),
			],
		}),
	);
}

export function eraseDone(): ContainerMessage {
	return containerMessage(
		container({
			accent: theme.colours.success,
			parts: [
				text(
					`## ${theme.emoji.success} Your data has been deleted\nEverything ${botName()} kept about you is gone, in every server, and you have been signed out of the dashboard everywhere. Warnings, cases and blocks against you stay with the servers they protect.`,
				),
			],
		}),
	);
}

/** The last step before anything is deleted: they type their own username, or their Discord ID. */
export function eraseConfirmForm(userId: string, username: string): ModalBuilder {
	return new ModalBuilder()
		.setCustomId(customId(ERASE_PANEL_ID, "erase", userId))
		.setTitle("Delete my data for good")
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`**This is the last step.** Everything ${botName()} keeps about you is deleted the moment you press Submit, and there is no getting it back.`,
			),
		)
		.addLabelComponents(
			new LabelBuilder()
				.setLabel("Type your username to confirm")
				.setDescription(`Your username is ${username}. Your Discord ID works too.`.slice(0, 100))
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId(ERASE_CONFIRM_FIELD)
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setMaxLength(64)
						.setPlaceholder(username),
				),
		);
}
