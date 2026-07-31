import { type ButtonStyle } from "discord.js";
import { type Category } from "@config/categories";
import { customId } from "@core/button";
import { button, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithButton,
	text,
} from "@lib/containers.util";

/**
 * The house style for a Components V2 settings panel: title, status, an optional note, rows with their own control
 * beside them, captioned pickers, then actions.
 */

export interface ScreenAction {
	/** Becomes the action part of the custom ID. */
	action: string;
	label: string;
	style?: ButtonStyle;
	emoji?: string;
	disabled?: boolean;
	/** Extra arguments before the owner ID. */
	args?: (string | number)[];
}

/** A select menu with a caption above it. */
export interface ScreenPicker {
	label: string;
	/** A line of smaller text under the label, for anything worth explaining. */
	hint?: string;
	control: ContainerPart;
}

export interface ScreenRow {
	label: string;
	value: string;
	/** The control that changes this row, rendered beside it. */
	action?: ScreenAction;
}

export interface SettingsScreenOptions {
	/** The button handler's ID. */
	id: string;
	ownerId: string;
	category: Category;
	title: string;
	status: string;
	/** A one-line result from the last press. */
	note?: string;
	rows?: ScreenRow[];
	/** Pre-built select rows, which only the caller knows how to fill. */
	pickers?: ScreenPicker[];
	actions?: ScreenAction[];
	footer?: string;
}

function control(id: string, action: ScreenAction, ownerId: string): string {
	return customId(id, action.action, ...(action.args ?? []), ownerId);
}

function toButton(id: string, action: ScreenAction, ownerId: string): ReturnType<typeof button> {
	return button({
		id: control(id, action, ownerId),
		label: action.label,
		...(action.style !== undefined ? { style: action.style } : {}),
		...(action.emoji !== undefined ? { emoji: action.emoji } : {}),
		...(action.disabled !== undefined ? { disabled: action.disabled } : {}),
	});
}

export function settingsScreen(options: SettingsScreenOptions): ContainerMessage {
	const parts: ContainerPart[] = [text(`## ${options.title}\n${options.status}`)];
	if (options.note !== undefined) parts.push(text(`-# ${options.note}`));

	const rows = options.rows ?? [];
	if (rows.length > 0) {
		parts.push(divider());

		for (const entry of rows) {
			const line = `**${entry.label}**\n${entry.value}`;

			parts.push(
				entry.action === undefined
					? text(line)
					: sectionWithButton(line, toButton(options.id, entry.action, options.ownerId)),
			);
		}
	}

	const pickers = options.pickers ?? [];
	if (pickers.length > 0) {
		parts.push(divider());

		for (const [index, picker] of pickers.entries()) {
			if (index > 0) parts.push(divider({ spacer: true }));

			parts.push(text(`**${picker.label}**${picker.hint === undefined ? "" : `\n-# ${picker.hint}`}`), picker.control);
		}
	}

	const actions = options.actions ?? [];
	if (actions.length > 0) {
		parts.push(divider());

		for (let index = 0; index < actions.length; index += 5) {
			parts.push(
				row(...actions.slice(index, index + 5).map((action) => toButton(options.id, action, options.ownerId))),
			);
		}
	}

	if (options.footer !== undefined) parts.push(text(`-# ${options.footer}`));

	return containerMessage(container({ category: options.category, parts }));
}

/** `🟢 On` / `🔴 Off`, so status reads at a glance rather than as a word. */
export function statusDot(enabled: boolean): string {
	return enabled ? "🟢 On" : "🔴 Off";
}

/** A channel mention, or a plain "not set" — never an empty cell. */
export function channelValue(channelId: string | null | undefined): string {
	return channelId === null || channelId === undefined ? "_Not set_" : `<#${channelId}>`;
}

/** A role mention list, or a plain "none". */
export function roleValue(roleIds: readonly string[]): string {
	return roleIds.length === 0 ? "_None_" : roleIds.map((id) => `<@&${id}>`).join(" ");
}
