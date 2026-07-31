import blackjack from "@commands/games/subcommands/blackjack.command";
import eightBall from "@commands/games/subcommands/eightBall.command";
import fastType from "@commands/games/subcommands/fastType.command";
import guessTheNumber from "@commands/games/subcommands/guessTheNumber.command";
import guessThePokemon from "@commands/games/subcommands/guessThePokemon.command";
import rockPaperScissors from "@commands/games/subcommands/rockPaperScissors.command";
import wouldYouRather from "@commands/games/subcommands/wouldYouRather.command";
import { asSubcommand, defineCommand } from "@core/command";

/** Discord allows an application 100 commands, so related ones live together here. */
export default defineCommand({
	name: "game",
	description: "Something to play.",
	category: "games",

	subcommands: [
		asSubcommand(blackjack, ["bj"]),
		asSubcommand(eightBall),
		asSubcommand(fastType, ["fasttype"]),
		asSubcommand(guessTheNumber, ["guessnumber"]),
		asSubcommand(guessThePokemon, ["pokemon", "guesspokemon"]),
		asSubcommand(rockPaperScissors),
		asSubcommand(wouldYouRather, ["wyr"]),
	],
});
