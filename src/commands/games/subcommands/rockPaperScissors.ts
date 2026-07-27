import { randomInt } from "node:crypto";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../lib/embeds";
import { reply } from "../../../lib/reply";

const MOVES = ["rock", "paper", "scissors"] as const;
type Move = (typeof MOVES)[number];

const EMOJI: Record<Move, string> = { rock: "\u{1faa8}", paper: "\u{1f4c4}", scissors: "\u2702\ufe0f" };
const BEATS: Record<Move, Move> = { rock: "scissors", paper: "rock", scissors: "paper" };

export default defineCommand({
	name: "rps",
	description: "Plays rock, paper, scissors.",
	category: "games",
	options: [
		{
			name: "move",
			description: "Your move.",
			type: "string",
			required: true,
			choices: MOVES.map((move) => ({ name: move, value: move })),
		},
	],

	async run(interaction) {
		const yours = interaction.options.getString("move", true) as Move;
		const mine = MOVES[randomInt(MOVES.length)]!;

		const result = yours === mine ? "It is a draw." : BEATS[yours] === mine ? "You win." : "I win.";

		await reply(interaction, {
			embeds: [
				embed({
					category: "games",
					title: "Rock, paper, scissors",
					description: `You chose ${EMOJI[yours]} **${yours}**.\nI chose ${EMOJI[mine]} **${mine}**.\n\n**${result}**`,
				}),
			],
		});
	},
});
