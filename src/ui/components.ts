import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type MessageActionRowComponentBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuOptionBuilder,
} from "discord.js";
import { theme } from "../config/theme";
import { encodeId, type Namespace } from "../core/customId";

export interface ButtonOptions {
	id: string;
	label?: string;
	style?: ButtonStyle;
	emoji?: string;
	disabled?: boolean;
}

/** Always takes a `ButtonStyle`; raw style codes cannot reach the API from here. */
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
	namespace: Namespace,
	action: string,
	ownerId: string,
	...args: string[]
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	return row(
		button({
			id: encodeId(namespace, `${action}-yes`, ...args, ownerId),
			label: "Confirm",
			style: ButtonStyle.Success,
		}),
		button({
			id: encodeId(namespace, `${action}-no`, ...args, ownerId),
			label: "Cancel",
			style: ButtonStyle.Danger,
		}),
	);
}

/** Pagination controls. All state lives in the custom ID, so nothing is held server-side. */
export function navRow(
	namespace: Namespace,
	page: number,
	total: number,
	ownerId: string,
	key = "-",
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const atStart = page <= 0;
	const atEnd = page >= total - 1;

	return row(
		button({
			id: encodeId(namespace, "goto", key, "0", ownerId),
			emoji: theme.emoji.first,
			disabled: atStart,
		}),
		button({
			id: encodeId(namespace, "goto", key, String(Math.max(0, page - 1)), ownerId),
			emoji: theme.emoji.previous,
			disabled: atStart,
		}),
		button({
			id: encodeId(namespace, "noop", key, String(page), ownerId),
			label: `${page + 1} / ${Math.max(1, total)}`,
			disabled: true,
		}),
		button({
			id: encodeId(namespace, "goto", key, String(Math.min(total - 1, page + 1)), ownerId),
			emoji: theme.emoji.next,
			disabled: atEnd,
		}),
		button({
			id: encodeId(namespace, "goto", key, String(Math.max(0, total - 1)), ownerId),
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
			if (component instanceof ButtonBuilder && component.data.style !== ButtonStyle.Link) {
				component.setDisabled(true);
			} else if (component instanceof StringSelectMenuBuilder) {
				component.setDisabled(true);
			}
		}
	}
	return rows;
}
