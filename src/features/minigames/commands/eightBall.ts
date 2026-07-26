import { randomInt } from "node:crypto";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

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
	category: Category.MiniGames,
	surfaces: ["slash", "prefix"],
	aliases: ["eightball"],
	options: [{ name: "question", description: "What you want to know.", type: "string", required: true, greedy: true }],

	async execute(ctx) {
		await ctx.reply({
			embeds: [
				embed({
					category: Category.MiniGames,
					title: "\u{1f3b1} Magic eight ball",
					fields: [
						{ name: "Question", value: truncate(ctx.options.getString("question", true), 500) },
						{ name: "Answer", value: ANSWERS[randomInt(ANSWERS.length)]! },
					],
				}),
			],
		});
	},
});
