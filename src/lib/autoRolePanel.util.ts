import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { roleSelect, row } from "@lib/components.util";
import { type ContainerMessage } from "@lib/containers.util";
import { roleValue, settingsScreen } from "@lib/settingsScreen.util";

/**
 * Auto-roles, as a pre-ticked menu rather than `add` and `remove` subcommands.
 *
 * The menu *is* the list: what is ticked is what new members get, so removing a
 * role is deselecting it and there is no second control to hunt for.
 */

export const AUTOROLE_PANEL_ID = "autorole";

/** Discord's cap on a role select, and plenty for a join list. */
export const MAX_AUTO_ROLES = 10;

export interface AutoRolePanelState {
	roleIds: string[];
	/** Roles the bot cannot actually assign, so the panel can say so. */
	unusable?: string[];
	note?: string;
}

export function autoRolePanel(state: AutoRolePanelState, ownerId: string): ContainerMessage {
	const unusable = state.unusable ?? [];

	return settingsScreen({
		id: AUTOROLE_PANEL_ID,
		ownerId,
		category: "settings",
		title: "🎭 Auto-roles",
		status:
			state.roleIds.length === 0
				? "New members are given nothing yet. Pick the roles below."
				: `New members are given ${roleValue(state.roleIds)}.`,
		...(state.note !== undefined ? { note: state.note } : {}),
		rows:
			unusable.length === 0
				? []
				: [
						{
							label: "⚠️ I cannot assign these",
							value: `${roleValue(unusable)}\nMove my role above them in Server Settings → Roles, or deselect them.`,
						},
					],
		pickers: [
			{
				label: "Roles given on join",
				hint: "What is ticked is what new members get — deselect a role to stop giving it.",
				control: row(
					roleSelect({
						id: customId(AUTOROLE_PANEL_ID, "roles", ownerId),
						placeholder: "Roles to give new members…",
						minValues: 0,
						maxValues: MAX_AUTO_ROLES,
						defaultRoleIds: state.roleIds,
					}),
				),
			},
		],
		actions: [
			{
				action: "clear",
				label: "Give nothing",
				style: ButtonStyle.Danger,
				disabled: state.roleIds.length === 0,
			},
		],
		footer: "Applied the moment someone joins. Integration-managed roles cannot be given out.",
	});
}
