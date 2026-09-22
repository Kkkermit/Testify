import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, roleSelect, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	text,
} from "@lib/containers.util";
import { MUSIC_ID } from "@lib/musicPanel.util";
import { MUSIC_LIMITS } from "@lib/musicSettings.util";
import { type MusicSettings } from "@testify/shared";

/** Whether the music system runs in this server, and which roles may drive it. */

export function djLine(settings: MusicSettings): string {
	if (settings.djRoleIds.length === 0) return "Anybody in the server can use the player.";

	return `Only these roles can use the player: ${settings.djRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")}`;
}

export function musicSystemPanel(settings: MusicSettings, userId: string, note?: string): ContainerMessage {
	const parts: ContainerPart[] = [text("## 🎛️ Music system")];

	if (note !== undefined) parts.push(text(`-# ${note}`));

	parts.push(
		text(
			settings.enabled
				? "**On.** `/play` and the `/music` controls are available in this server."
				: "**Off.** Every music command is refused here until it is turned back on.",
		),
		row(
			button({
				id: customId(MUSIC_ID, settings.enabled ? "system-off" : "system-on", userId),
				label: settings.enabled ? "Turn off" : "Turn on",
				emoji: settings.enabled ? "🚫" : "✅",
				style: settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success,
			}),
		),
		divider(),
		text("### 🎧 DJ roles"),
		text(djLine(settings)),
		// Pre-ticked, so removing a role is deselecting it rather than a second control to find.
		row(
			roleSelect({
				id: customId(MUSIC_ID, "djroles", userId),
				placeholder: "Leave empty to let anybody use it",
				minValues: 0,
				maxValues: MUSIC_LIMITS.maxDjRoles,
				defaultRoleIds: settings.djRoleIds,
			}),
		),
		text("-# Anybody with Manage Server can always use the player, whatever is chosen here."),
	);

	return containerMessage(container({ category: "music", parts }));
}
