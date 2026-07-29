import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	type EmbedBuilder,
	type MessageActionRowComponentBuilder,
	ModalBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { theme } from "@config/theme";
import { customId } from "@core/button";

/** What every panel returns: one embed set and its controls. */
export interface RenderedScreen {
	embeds: EmbedBuilder[];
	components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

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

/**
 * A channel picker, which beats asking someone to paste an ID or hunt for a
 * `#channel` mention. Discord filters the list to the types given.
 */
export function channelSelect(options: {
	id: string;
	placeholder?: string;
	channelTypes?: ChannelType[];
	disabled?: boolean;
}): ChannelSelectMenuBuilder {
	const builder = new ChannelSelectMenuBuilder()
		.setCustomId(options.id)
		.setChannelTypes(options.channelTypes ?? [ChannelType.GuildText, ChannelType.GuildAnnouncement])
		.setDisabled(options.disabled ?? false);

	if (options.placeholder !== undefined) builder.setPlaceholder(options.placeholder);
	return builder;
}

/** An option for `select()`, with `default: true` making it show as already chosen. */
export function option(config: {
	label: string;
	value: string;
	description?: string;
	emoji?: string;
	selected?: boolean;
}): StringSelectMenuOptionBuilder {
	const builder = new StringSelectMenuOptionBuilder()
		.setLabel(config.label.slice(0, 100))
		.setValue(config.value)
		.setDefault(config.selected ?? false);

	if (config.description !== undefined) builder.setDescription(config.description.slice(0, 100));
	if (config.emoji !== undefined) builder.setEmoji(config.emoji);
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

/**
 * `[25%] [50%] [All] [Custom…]` for an amount the user would otherwise type.
 *
 * The percentages are resolved to real figures here rather than in the handler,
 * so the label shows what pressing it will actually do.
 */
export function quickAmountRow(
	id: string,
	action: string,
	max: number,
	ownerId: string,
	format: (amount: number) => string = String,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const quarter = Math.floor(max * 0.25);
	const half = Math.floor(max * 0.5);

	return row(
		button({
			id: customId(id, action, quarter, ownerId),
			label: `25% — ${format(quarter)}`,
			disabled: quarter <= 0,
		}),
		button({ id: customId(id, action, half, ownerId), label: `50% — ${format(half)}`, disabled: half <= 0 }),
		button({
			id: customId(id, action, max, ownerId),
			label: `All — ${format(max)}`,
			style: ButtonStyle.Success,
			disabled: max <= 0,
		}),
		button({ id: customId(id, `${action}-custom`, ownerId), label: "Custom…", style: ButtonStyle.Secondary }),
	);
}

export interface ModalField {
	id: string;
	label: string;
	/** Defaults to a single-line input. */
	paragraph?: boolean;
	required?: boolean;
	placeholder?: string;
	maxLength?: number;
	/** Pre-fills the input. Passing the current setting turns a form into an editor. */
	value?: string;
}

/**
 * Builds a modal whose custom ID carries its own state, so the submit handler
 * knows what it is editing without anything being held in memory.
 *
 * Pre-filling `value` with the current setting is what turns a config command
 * into an editable form rather than a list of options nobody can discover.
 */
export function modalForm(options: {
	id: string;
	action: string;
	args?: (string | number)[];
	title: string;
	fields: ModalField[];
}): ModalBuilder {
	const modal = new ModalBuilder()
		.setCustomId(customId(options.id, options.action, ...(options.args ?? [])))
		.setTitle(options.title.slice(0, 45));

	modal.addComponents(
		options.fields.map((field) => {
			const input = new TextInputBuilder()
				.setCustomId(field.id)
				.setLabel(field.label.slice(0, 45))
				.setStyle(field.paragraph === true ? TextInputStyle.Paragraph : TextInputStyle.Short)
				.setRequired(field.required ?? true);

			if (field.placeholder !== undefined) input.setPlaceholder(field.placeholder);
			if (field.maxLength !== undefined) input.setMaxLength(field.maxLength);
			if (field.value !== undefined && field.value !== "") input.setValue(field.value);

			return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
		}),
	);

	return modal;
}
