import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { AUTO_RESPONDER_PANEL_ID } from "@lib/autoResponders/autoResponders.constants";
import { MATCH_LABELS } from "@lib/autoResponders/autoResponders.util";
import { button, option, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text, withoutPings } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { escapeMarkdown, truncate } from "@lib/format/format.util";
import { settingsScreen, type ScreenAction } from "@lib/settings/settingsScreen.util";
import { AUTO_RESPONDER_LIMITS, type AutoResponder } from "@testify/shared";

type QuietPanel = ContainerMessage & { allowedMentions: { parse: [] } };

/** One line of a list, flattened, so a reply with a heading or a code block cannot reshape the panel around it. */
function preview(value: string, max: number): string {
	return escapeMarkdown(truncate(value.replace(/\s+/g, " "), max));
}

/** Every responder in the server, picked from one menu, since a button each would run past Discord's 40 components. */
export function autoResponderHub(responders: readonly AutoResponder[], ownerId: string, note?: string): QuietPanel {
	const full = responders.length >= AUTO_RESPONDER_LIMITS.maxPerGuild;
	const parts: ContainerPart[] = [
		text(
			`## 💬 Auto-responders\n${
				responders.length === 0
					? "None yet. Add one, and it answers the words you choose with the reply you write."
					: `${String(responders.length)} of ${String(AUTO_RESPONDER_LIMITS.maxPerGuild)}.`
			}`,
		),
	];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	if (responders.length > 0) {
		parts.push(
			divider(),
			text(
				responders
					.map(
						(responder, index) =>
							`${String(index + 1)}. **${preview(responder.trigger, 40)}** → ${preview(responder.reply, 50)}`,
					)
					.join("\n"),
			),
			row(
				select({
					id: customId(AUTO_RESPONDER_PANEL_ID, "open", ownerId),
					placeholder: "Choose one to change or delete…",
					options: responders.map((responder) =>
						option({
							label: truncate(responder.trigger, 100),
							value: responder.id,
							description: truncate(responder.reply.replace(/\s+/g, " "), 100),
						}),
					),
				}),
			),
		);
	}

	parts.push(
		row(
			button({
				id: customId(AUTO_RESPONDER_PANEL_ID, "new", ownerId),
				label: "New auto-responder",
				emoji: "➕",
				style: ButtonStyle.Success,
				disabled: full,
			}),
		),
		text(
			full
				? "-# That is as many as a server can keep. Delete one to add another."
				: "-# They answer members, never bots, at most once every ten seconds in a channel, and never ping anybody.",
		),
	);

	return withoutPings(containerMessage(container({ category: "settings", parts })));
}

export interface AutoResponderEditorState {
	responder: AutoResponder;
	note?: string;
	confirmingDelete?: boolean;
}

/** One responder: its words, how they are matched and its reply, each applied on the press. */
export function autoResponderEditor(state: AutoResponderEditorState, ownerId: string): QuietPanel {
	const { responder } = state;
	const args = [responder.id];

	const actions: ScreenAction[] = state.confirmingDelete
		? [
				{ action: "delete-yes", label: "Delete it", style: ButtonStyle.Danger, args },
				{ action: "delete-no", label: "Keep it", args },
			]
		: [
				{ action: "delete", label: "Delete", style: ButtonStyle.Danger, args },
				{ action: "hub", label: "All auto-responders" },
			];

	return withoutPings(
		settingsScreen({
			id: AUTO_RESPONDER_PANEL_ID,
			ownerId,
			category: "settings",
			title: "💬 Auto-responder",
			status: state.confirmingDelete
				? "Delete this auto-responder? It stops answering straight away."
				: "Every change applies the moment you make it.",
			...(state.note !== undefined ? { note: state.note } : {}),
			rows: [
				{
					label: "Answers",
					value: escapeMarkdown(responder.trigger),
					action: { action: "edit", label: "Edit", args },
				},
				{
					label: "Matches",
					value: MATCH_LABELS[responder.match],
					action: { action: "match", label: "Change", args },
				},
				{ label: "Replies with", value: truncate(responder.reply, 1_000) },
			],
			actions,
		}),
	);
}
