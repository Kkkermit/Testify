import { asSubcommand, defineCommand } from "../../core/command";
import blackjack from "./_blackjack";
import eightBall from "./_eightBall";
import fastType from "./_fastType";
import guessTheNumber from "./_guessTheNumber";
import guessThePokemon from "./_guessThePokemon";
import rockPaperScissors from "./_rockPaperScissors";
import wouldYouRather from "./_wouldYouRather";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each `_name.ts` file beside this one is a normal command definition —
 * the leading underscore just stops the loader registering it twice.
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
