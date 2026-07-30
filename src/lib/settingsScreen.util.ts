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
 * The house style for a Components V2 settings panel.
 *
 * Every configurable feature used to have its own shape: some were three
 * subcommands taking options, some an embed with a row of buttons, some nothing
 * at all. This is the one screen they all render now, so an admin who has set up
 * levelling already knows how to set up automod.
 *
 * The layout, top to bottom:
 *
 * ```
 * ## 🔗 Anti-link                     title
 * Links are removed in #general.      status
 * -# Saved.                           note, from the last press
 * ───────────────────────────────
 * **Bypass** — Manage Messages  [Edit]   rows, each with its own button
 * ───────────────────────────────
 * [channel picker]                    pickers
 * [Turn off] [Reset]                  actions
 * -# Anything worth explaining.       footer
 * ```
 *
 * `settingsPanel.util.ts` is the embed-based ancestor of this and is still used by
 * the panels that have not been converted. New panels use this one.
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
	pickers?: ContainerPart[];
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

			// A button in its own section sits beside the setting it changes, rather
			// than in a row underneath where the reader has to count to match them up.
			parts.push(
				entry.action === undefined
					? text(line)
					: sectionWithButton(line, toButton(options.id, entry.action, options.ownerId)),
			);
		}
	}

	if (options.pickers !== undefined && options.pickers.length > 0) {
		parts.push(divider(), ...options.pickers);
	}

	const actions = options.actions ?? [];
	if (actions.length > 0) {
		parts.push(divider());

		// Five per row is Discord's limit, so they wrap rather than being rejected.
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
