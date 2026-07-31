import { ButtonStyle } from "discord.js";
import { DEFAULT_PREFIX } from "@config/constants";
import { type ContainerMessage } from "@lib/containers.util";
import { settingsScreen, statusDot } from "@lib/settingsScreen.util";

/** The prefix for text commands, from one screen rather than four subcommands. */

export const PREFIX_PANEL_ID = "prefixsetup";

export const PREFIX_LIMITS = { maxLength: 5 } as const;

export interface PrefixPanelState {
	prefix: string;
	isEnabled: boolean;
	note?: string;
}

/** A prefix with a space in it can never match, and one that is only whitespace would match every message. */
export function checkPrefix(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
	const value = raw.trim();

	if (value.length === 0) return { ok: false, reason: "The prefix cannot be empty." };
	if (value.length > PREFIX_LIMITS.maxLength) {
		return { ok: false, reason: `Keep it to ${PREFIX_LIMITS.maxLength} characters or fewer.` };
	}
	if (/\s/.test(value)) return { ok: false, reason: "A prefix cannot contain spaces — nothing would ever match it." };

	return { ok: true, value };
}

export function prefixPanel(state: PrefixPanelState, ownerId: string): ContainerMessage {
	return settingsScreen({
		id: PREFIX_PANEL_ID,
		ownerId,
		category: "settings",
		title: "⌨️ Text command prefix",
		status: state.isEnabled
			? `Members can run commands with \`${state.prefix}help\` as well as \`/help\`.`
			: "Text commands are off here. Slash commands still work.",
		...(state.note !== undefined ? { note: state.note } : {}),
		rows: [
			{ label: "Prefix", value: `\`${state.prefix}\``, action: { action: "edit", label: "Change" } },
			{ label: "Text commands", value: statusDot(state.isEnabled) },
		],
		actions: [
			{
				action: "toggle",
				label: state.isEnabled ? "Turn off" : "Turn on",
				style: state.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success,
			},
			{ action: "reset", label: `Reset to ${DEFAULT_PREFIX}`, disabled: state.prefix === DEFAULT_PREFIX },
		],
		footer: "Mentioning the bot works as a prefix too, whatever this is set to.",
	});
}
