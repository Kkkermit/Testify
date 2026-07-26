import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type MessageActionRowComponentBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuOptionBuilder,
} from "discord.js";
import { theme } from "../config/theme";
import { customId } from "../core/button";

export interface ButtonOptions {
	id: string;
	label?: string;
	style?: ButtonStyle;
	emoji?: string;
	disabled?: boolean;
}

export function button(options: ButtonOptions): ButtonBuilder {
	const builder = new ButtonBuilder()
		.setCustomId(options.id)
		.setStyle(options.style ?? ButtonStyle.Secondary)
		.setDisabled(options.disabled ?? false);

	if (options.label !== undefined) builder.setLabel(options.label);
	if (options.emoji !== undefined) builder.setEmoji(options.emoji);
	return builder;
}

export function linkButton(label: string, url: string, emoji?: string): ButtonBuilder {
	const builder = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
	if (emoji !== undefined) builder.setEmoji(emoji);
	return builder;
}

export function row(
	...components: MessageActionRowComponentBuilder[]
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...components);
}

export function selectRow(menu: StringSelectMenuBuilder): ActionRowBuilder<MessageActionRowComponentBuilder> {
	return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(menu);
}

export function select(options: {
	id: string;
	placeholder?: string;
	options: StringSelectMenuOptionBuilder[];
	minValues?: number;
	maxValues?: number;
	disabled?: boolean;
}): StringSelectMenuBuilder {
	const builder = new StringSelectMenuBuilder()
		.setCustomId(options.id)
		.addOptions(...options.options)
		.setMinValues(options.minValues ?? 1)
		.setMaxValues(options.maxValues ?? 1)
		.setDisabled(options.disabled ?? false);

	if (options.placeholder !== undefined) builder.setPlaceholder(options.placeholder);
	return builder;
}

/** Confirm / cancel pair. The invoking user ID goes last so `ownerOnly` can read it. */
export function confirmRow(
	id: string,
	action: string,
	ownerId: string,
	...args: string[]
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	return row(
		button({ id: customId(id, `${action}-yes`, ...args, ownerId), label: "Confirm", style: ButtonStyle.Success }),
		button({ id: customId(id, `${action}-no`, ...args, ownerId), label: "Cancel", style: ButtonStyle.Danger }),
	);
}

/** Pagination controls. Page state lives in the custom ID, so nothing is held in memory. */
export function navRow(
	id: string,
	page: number,
	total: number,
	ownerId: string,
	key = "-",
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const atStart = page <= 0;
	const atEnd = page >= total - 1;

	return row(
		button({ id: customId(id, "goto", key, 0, ownerId), emoji: theme.emoji.first, disabled: atStart }),
		button({
			id: customId(id, "goto", key, Math.max(0, page - 1), ownerId),
			emoji: theme.emoji.previous,
			disabled: atStart,
		}),
		button({
			id: customId(id, "noop", key, page, ownerId),
			label: `${page + 1} / ${Math.max(1, total)}`,
			disabled: true,
		}),
		button({
			id: customId(id, "goto", key, Math.min(total - 1, page + 1), ownerId),
			emoji: theme.emoji.next,
			disabled: atEnd,
		}),
		button({
			id: customId(id, "goto", key, Math.max(0, total - 1), ownerId),
			emoji: theme.emoji.last,
			disabled: atEnd,
		}),
	);
}

export function disableAll(
	rows: ActionRowBuilder<MessageActionRowComponentBuilder>[],
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
	for (const actionRow of rows) {
		for (const component of actionRow.components) {
			if (component instanceof ButtonBuilder && component.data.style !== ButtonStyle.Link) component.setDisabled(true);
			else if (component instanceof StringSelectMenuBuilder) component.setDisabled(true);
		}
	}
	return rows;
}
