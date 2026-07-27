import { asSubcommand, defineCommand } from "../../core/command";
import ascii from "./subcommands/ascii";
import dadJoke from "./subcommands/dadJoke";
import fakeTweet from "./subcommands/fakeTweet";
import hack from "./subcommands/hack";
import iq from "./subcommands/iq";
import nitro from "./subcommands/nitro";
import oogway from "./subcommands/oogway";
import pepeSign from "./subcommands/pepeSign";
import relationship from "./subcommands/relationship";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each file in `subcommands/` is an ordinary command definition; the
 * loader only registers files sitting directly in a category folder, so they
 * appear only as part of this one.
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
