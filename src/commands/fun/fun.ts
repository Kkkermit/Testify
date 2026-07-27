import { asSubcommand, defineCommand } from "../../core/command";
import ascii from "./_ascii";
import dadJoke from "./_dadJoke";
import fakeTweet from "./_fakeTweet";
import hack from "./_hack";
import iq from "./_iq";
import nitro from "./_nitro";
import oogway from "./_oogway";
import pepeSign from "./_pepeSign";
import relationship from "./_relationship";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each `_name.ts` file beside this one is a normal command definition —
 * the leading underscore just stops the loader registering it twice.
 *
 * `t?meme` still works: a folded-in command keeps its own name as a prefix alias.
 */
export default defineCommand({
	name: "fun",
	description: "Jokes, generators and other nonsense.",
	category: "fun",

	subcommands: [
		asSubcommand(ascii),
		asSubcommand(dadJoke, ["dadjoke"]),
		asSubcommand(fakeTweet, ["faketweet", "tweet"]),
		asSubcommand(hack),
		asSubcommand(iq),
		asSubcommand(nitro),
		asSubcommand(oogway, ["oogway"]),
		asSubcommand(pepeSign, ["sign", "pepesign"]),
		asSubcommand(relationship, ["ship"]),
	],
});
