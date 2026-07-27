import blackjack from "@commands/games/subcommands/blackjack.slash";
import eightBall from "@commands/games/subcommands/eightBall.slash";
import fastType from "@commands/games/subcommands/fastType.slash";
import guessTheNumber from "@commands/games/subcommands/guessTheNumber.slash";
import guessThePokemon from "@commands/games/subcommands/guessThePokemon.slash";
import rockPaperScissors from "@commands/games/subcommands/rockPaperScissors.slash";
import wouldYouRather from "@commands/games/subcommands/wouldYouRather.slash";
import { asSubcommand, defineCommand } from "@core/command";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each file in `subcommands/` is an ordinary command definition; the
 * loader only registers files sitting directly in a category folder, so they
 * appear only as part of this one.
 *
 * `t?meme` still works: a folded-in command keeps its own name as a prefix alias.
 */
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
