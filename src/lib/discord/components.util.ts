import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	LabelBuilder,
	type MessageActionRowComponentBuilder,
	ModalBuilder,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { truncate } from "@lib/format/format.util";

/** Discord's caps on component text; discord.js throws on anything longer, which fails the whole message. */
const CAPS = { buttonLabel: 80, placeholder: 150, optionText: 100, modalText: 45, inputPlaceholder: 100 } as const;

interface ButtonOptions {
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

	if (options.label !== undefined) builder.setLabel(truncate(options.label, CAPS.buttonLabel));
	if (options.emoji !== undefined) builder.setEmoji(options.emoji);
	return builder;
}

export function linkButton(label: string, url: string, emoji?: string): ButtonBuilder {
	const builder = new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel(truncate(label, CAPS.buttonLabel))
		.setURL(url);
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

	if (options.placeholder !== undefined) builder.setPlaceholder(truncate(options.placeholder, CAPS.placeholder));
	return builder;
}

export function channelSelect(options: {
	id: string;
	placeholder?: string;
	channelTypes?: ChannelType[];
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	/** Pre-ticks these, which is what turns the menu into an editable list. */
	defaultChannelIds?: string[];
}): ChannelSelectMenuBuilder {
	const builder = new ChannelSelectMenuBuilder()
		.setCustomId(options.id)
		.setChannelTypes(options.channelTypes ?? [ChannelType.GuildText, ChannelType.GuildAnnouncement])
		.setDisabled(options.disabled ?? false)
		.setMinValues(options.minValues ?? 1)
		.setMaxValues(options.maxValues ?? 1);

	if (options.placeholder !== undefined) builder.setPlaceholder(truncate(options.placeholder, CAPS.placeholder));
	if (options.defaultChannelIds !== undefined) builder.setDefaultChannels(options.defaultChannelIds);
	return builder;
}

export function roleSelect(options: {
	id: string;
	placeholder?: string;
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	defaultRoleIds?: string[];
}): RoleSelectMenuBuilder {
	const builder = new RoleSelectMenuBuilder()
		.setCustomId(options.id)
		.setDisabled(options.disabled ?? false)
		.setMinValues(options.minValues ?? 1)
		.setMaxValues(options.maxValues ?? 1);

	if (options.placeholder !== undefined) builder.setPlaceholder(truncate(options.placeholder, CAPS.placeholder));
	if (options.defaultRoleIds !== undefined) builder.setDefaultRoles(options.defaultRoleIds);
	return builder;
}

/** An option for `select()`; `selected` shows it as already chosen. */
export function option(config: {
	label: string;
	value: string;
	description?: string;
	emoji?: string;
	selected?: boolean;
}): StringSelectMenuOptionBuilder {
	const builder = new StringSelectMenuOptionBuilder()
		.setLabel(truncate(config.label, CAPS.optionText))
		.setValue(config.value)
		.setDefault(config.selected ?? false);

	if (config.description !== undefined) builder.setDescription(truncate(config.description, CAPS.optionText));
	if (config.emoji !== undefined) builder.setEmoji(config.emoji);
	return builder;
}

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

export function navRow(
	id: string,
	page: number,
	total: number,
	ownerId: string,
	key = "-",
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const atStart = page <= 0;
	const atEnd = page >= total - 1;
	const goto = (slot: string, target: number): string => customId(id, "goto", key, target, slot, ownerId);

	return row(
		button({ id: goto("first", 0), emoji: theme.emoji.first, disabled: atStart }),
		button({ id: goto("prev", Math.max(0, page - 1)), emoji: theme.emoji.previous, disabled: atStart }),
		button({
			id: customId(id, "noop", key, page, "at", ownerId),
			label: `${page + 1} / ${Math.max(1, total)}`,
			disabled: true,
		}),
		button({ id: goto("next", Math.min(total - 1, page + 1)), emoji: theme.emoji.next, disabled: atEnd }),
		button({ id: goto("last", Math.max(0, total - 1)), emoji: theme.emoji.last, disabled: atEnd }),
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

/** `[25%] [50%] [All] [Custom…]` for an amount the user would otherwise type. */
export function quickAmountRow(
	id: string,
	action: string,
	max: number,
	ownerId: string,
	format: (amount: number) => string = String,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const quarter = Math.floor(max * 0.25);
	const half = Math.floor(max * 0.5);

	// The slot goes after the amount because equal amounts on a small balance would give duplicate custom IDs.
	const amount = (slot: string, value: number): string => customId(id, action, value, slot, ownerId);

	return row(
		button({ id: amount("quarter", quarter), label: `25% — ${format(quarter)}`, disabled: quarter <= 0 }),
		button({ id: amount("half", half), label: `50% — ${format(half)}`, disabled: half <= 0 }),
		button({
			id: amount("all", max),
			label: `All — ${format(max)}`,
			style: ButtonStyle.Success,
			disabled: max <= 0,
		}),
		button({ id: customId(id, `${action}-custom`, ownerId), label: "Custom…", style: ButtonStyle.Secondary }),
	);
}

interface ModalField {
	id: string;
	label: string;
	paragraph?: boolean;
	required?: boolean;
	placeholder?: string;
	maxLength?: number;
	value?: string;
}

/** A modal whose custom ID carries its own state, so the submit handler knows what it is editing. */
export function modalForm(options: {
	id: string;
	action: string;
	args?: (string | number)[];
	title: string;
	fields: ModalField[];
}): ModalBuilder {
	const modal = new ModalBuilder()
		.setCustomId(customId(options.id, options.action, ...(options.args ?? [])))
		.setTitle(truncate(options.title, CAPS.modalText));

	modal.addLabelComponents(
		options.fields.map((field) => {
			const input = new TextInputBuilder()
				.setCustomId(field.id)
				.setStyle(field.paragraph === true ? TextInputStyle.Paragraph : TextInputStyle.Short)
				.setRequired(field.required ?? true);

			if (field.placeholder !== undefined) input.setPlaceholder(truncate(field.placeholder, CAPS.inputPlaceholder));
			if (field.maxLength !== undefined) input.setMaxLength(field.maxLength);
			if (field.value !== undefined && field.value !== "") input.setValue(field.value);

			return new LabelBuilder().setLabel(truncate(field.label, CAPS.modalText)).setTextInputComponent(input);
		}),
	);

	return modal;
}
