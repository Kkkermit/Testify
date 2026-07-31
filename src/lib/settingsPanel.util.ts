import { type ActionRowBuilder, ButtonStyle, type MessageActionRowComponentBuilder } from "discord.js";
import { type Category } from "@config/categories";
import { customId } from "@core/button";
import { button, disableAll, type RenderedScreen, row } from "@lib/components.util";
import { embed } from "@lib/embeds.util";

/** A config screen: current values on the left, one button per editable field. */

export interface SettingsField {
	label: string;
	value: string;
	inline?: boolean;
}

export interface SettingsAction {
	/** Becomes the action part of the custom ID. */
	action: string;
	label: string;
	style?: ButtonStyle;
	emoji?: string;
	disabled?: boolean;
}

export interface SettingsPanelOptions {
	/** The button handler's ID. */
	id: string;
	category: Category;
	title: string;
	description?: string;
	fields: SettingsField[];
	/** Up to five per row; they are wrapped automatically. */
	actions: SettingsAction[];
	/** Trailing args on every button, so the handler knows what it is editing. */
	args?: (string | number)[];
	footer?: string;
	/** Greys everything out — for a panel that has been superseded. */
	disabled?: boolean;
}

export function settingsPanel(options: SettingsPanelOptions): RenderedScreen {
	const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

	for (let index = 0; index < options.actions.length; index += 5) {
		rows.push(
			row(
				...options.actions.slice(index, index + 5).map((action) =>
					button({
						id: customId(options.id, action.action, ...(options.args ?? [])),
						label: action.label,
						style: action.style ?? ButtonStyle.Secondary,
						...(action.emoji !== undefined ? { emoji: action.emoji } : {}),
						...(action.disabled !== undefined ? { disabled: action.disabled } : {}),
					}),
				),
			),
		);
	}

	return {
		embeds: [
			embed({
				category: options.category,
				title: options.title,
				...(options.description !== undefined ? { description: options.description } : {}),
				fields: options.fields.map((field) => ({
					name: field.label,
					value: field.value,
					inline: field.inline ?? true,
				})),
				...(options.footer !== undefined ? { footer: options.footer } : {}),
			}),
		],
		components: options.disabled === true ? disableAll(rows) : rows,
	};
}

/** `🟢 Enabled` / `🔴 Disabled`, so status reads at a glance rather than as a word. */
export function statusValue(enabled: boolean): string {
	return enabled ? "🟢 Enabled" : "🔴 Disabled";
}

/** Reads a whole number out of a modal field, rejecting anything that is not one. */
export function parseWholeNumber(
	raw: string,
	label: string,
	bounds: { min: number; max: number },
): { ok: true; value: number } | { ok: false; reason: string } {
	const value = Number(raw.trim().replace(/[,_\s]/g, ""));

	if (!Number.isInteger(value)) return { ok: false, reason: `**${label}** has to be a whole number.` };
	if (value < bounds.min || value > bounds.max) {
		return { ok: false, reason: `**${label}** has to be between ${bounds.min} and ${bounds.max}.` };
	}

	return { ok: true, value };
}
