import { PermissionFlagsBits } from "discord.js";
import { SECOND_MS } from "@config/constants";
import { defineCommand } from "@core/command";
import { reply } from "@lib/discord";
import { ANSWER_SEPARATOR, POLL_COMMAND, POLL_LIMITS, pollMessage } from "@lib/polls";

/** Posts one of Discord's own polls, which Discord counts and closes by itself. */
export default defineCommand({
	name: POLL_COMMAND,
	description: "Posts a poll people vote on.",
	category: "community",
	guildOnly: true,
	cooldown: 30 * SECOND_MS,
	permissions: [PermissionFlagsBits.SendPolls],
	botPermissions: [PermissionFlagsBits.SendPolls],
	options: [
		{
			name: "question",
			description: "What you are asking.",
			type: "string",
			required: true,
			maxLength: POLL_LIMITS.maxQuestion,
		},
		{
			name: "answers",
			description: `${String(POLL_LIMITS.minAnswers)} to ${String(POLL_LIMITS.maxAnswers)} answers, separated by ${ANSWER_SEPARATOR}, like Yes ${ANSWER_SEPARATOR} No.`,
			type: "string",
			required: true,
		},
		{
			name: "hours",
			description: `How long it stays open, in hours. ${String(POLL_LIMITS.defaultHours)} unless you say.`,
			type: "integer",
			min: POLL_LIMITS.minHours,
			max: POLL_LIMITS.maxHours,
		},
		{ name: "multiple", description: "Let people pick more than one answer.", type: "boolean" },
	],
	async run(interaction) {
		await reply(
			interaction,
			pollMessage({
				question: interaction.options.getString("question", true),
				answers: interaction.options.getString("answers", true),
				hours: interaction.options.getInteger("hours"),
				multiple: interaction.options.getBoolean("multiple"),
			}),
		);
	},
});
