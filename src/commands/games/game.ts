import { asSubcommand, defineCommand } from "../../core/command";
import blackjack from "./subcommands/blackjack";
import eightBall from "./subcommands/eightBall";
import fastType from "./subcommands/fastType";
import guessTheNumber from "./subcommands/guessTheNumber";
import guessThePokemon from "./subcommands/guessThePokemon";
import rockPaperScissors from "./subcommands/rockPaperScissors";
import wouldYouRather from "./subcommands/wouldYouRather";

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
