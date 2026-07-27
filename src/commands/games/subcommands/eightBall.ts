import { randomInt } from "node:crypto";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds";
import { truncate } from "@lib/format";
import { reply } from "@lib/reply";

const ANSWERS = [
	"It is certain.",
	"Without a doubt.",
	"You may rely on it.",
	"Most likely.",
	"Signs point to yes.",
	"Ask again later.",
	"Better not tell you now.",
	"Cannot predict now.",
	"Do not count on it.",
	"My reply is no.",
	"Very doubtful.",
	"Absolutely not.",
];

export default defineCommand({
	name: "8ball",
	description: "Asks the magic eight ball.",
	category: "games",
	options: [{ name: "question", description: "What you want to know.", type: "string", required: true }],

	async run(interaction) {
		await reply(interaction, {
			embeds: [
				embed({
					category: "games",
					title: "\u{1f3b1} Magic eight ball",
					fields: [
						{ name: "Question", value: truncate(interaction.options.getString("question", true), 500) },
						{ name: "Answer", value: ANSWERS[randomInt(ANSWERS.length)]! },
					],
				}),
			],
		});
	},
});
