import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { option, select, selectRow } from "@lib/components.util";
import { type ContainerMessage } from "@lib/containers.util";
import { humanisePermission } from "@lib/format.util";
import { settingsScreen } from "@lib/settingsScreen.util";

/** Link removal, configured from one screen rather than `enable`/`disable`/`status`. */

export const ANTILINK_PANEL_ID = "antilink";

/** The permissions worth offering as a bypass, coarsest last. */
export const BYPASS_PERMISSIONS = ["ManageMessages", "ManageGuild", "ModerateMembers", "Administrator"] as const;
export type BypassPermission = (typeof BYPASS_PERMISSIONS)[number];

export const DEFAULT_BYPASS: BypassPermission = "ManageMessages";

export function isBypassPermission(value: string): value is BypassPermission {
	return (BYPASS_PERMISSIONS as readonly string[]).includes(value);
}

export interface AntiLinkPanelState {
	enabled: boolean;
	bypass: BypassPermission;
	note?: string;
}

export function antiLinkPanel(state: AntiLinkPanelState, ownerId: string): ContainerMessage {
	return settingsScreen({
		id: ANTILINK_PANEL_ID,
		ownerId,
		category: "settings",
		title: "🔗 Link removal",
		status: state.enabled
			? `Links posted by members without **${humanisePermission(state.bypass)}** are deleted, and the member is warned.`
			: "Members can post links freely. Turn it on below.",
		...(state.note !== undefined ? { note: state.note } : {}),
		pickers: [
			{
				label: "Bypass permission",
				hint: "Members holding this may post links. Everyone else has theirs removed.",
				control: selectRow(
					select({
						id: customId(ANTILINK_PANEL_ID, "bypass", ownerId),
						placeholder: "Who may still post links…",
						disabled: !state.enabled,
						options: BYPASS_PERMISSIONS.map((permission) =>
							option({
								label: humanisePermission(permission),
								value: permission,
								description: `Members with ${humanisePermission(permission)} are not filtered`,
								selected: permission === state.bypass,
							}),
						),
					}),
				),
			},
		],
		actions: [
			{
				action: "toggle",
				label: state.enabled ? "Turn off" : "Turn on",
				style: state.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
			},
		],
		footer: "Every removal is recorded as a warning, so repeat offenders are visible in `/warn-id list`.",
	});
}
