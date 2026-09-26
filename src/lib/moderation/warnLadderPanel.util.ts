import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, option, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { WARN_LADDER_ID } from "@lib/moderation/moderation.constants";
import { stepLabel } from "@lib/moderation/warnActions.util";
import { WARN_LIMITS, WARN_STEP_CHOICES, type WarnLadder, stepValue } from "@testify/shared";

/** What each warning does, one menu per warning number, applied the moment a choice is made. */

export function warnLadderPanel(ladder: WarnLadder, userId: string, note?: string): ContainerMessage {
	const { steps } = ladder;
	const parts: ContainerPart[] = [
		text("## ⚖️ Warning punishments"),
		text(
			[
				...(note === undefined ? [] : [`-# ${note}`]),
				steps.length === 0
					? "No punishments are set, so a warning is only a warning. Add a step to start."
					: "What each warning does to the member. Past the last step, the last one repeats.",
			].join("\n"),
		),
		divider(),
	];

	steps.forEach((step, index) => {
		const number = index + 1;
		// The warning number rides in every option's label, so each step costs two components rather than three.
		parts.push(
			row(
				select({
					id: customId(WARN_LADDER_ID, "set", String(index), userId),
					options: WARN_STEP_CHOICES.map((choice) =>
						option({
							label: `Warning ${String(number)} · ${stepLabel(choice)}`,
							value: stepValue(choice),
							selected: stepValue(choice) === stepValue(step),
						}),
					),
				}),
			),
		);
	});

	if (steps.length > 0) parts.push(divider());

	parts.push(
		row(
			button({
				id: customId(WARN_LADDER_ID, "add", userId),
				label: "Add a step",
				emoji: "➕",
				style: ButtonStyle.Secondary,
				disabled: steps.length >= WARN_LIMITS.maxSteps,
			}),
			button({
				id: customId(WARN_LADDER_ID, "pop", userId),
				label: "Remove the last step",
				emoji: "🗑️",
				style: ButtonStyle.Danger,
				disabled: steps.length === 0,
			}),
		),
	);

	return containerMessage(container({ category: "moderation", parts }));
}
