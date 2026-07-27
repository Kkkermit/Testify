import ascii from "@commands/fun/subcommands/ascii";
import dadJoke from "@commands/fun/subcommands/dadJoke";
import fakeTweet from "@commands/fun/subcommands/fakeTweet";
import hack from "@commands/fun/subcommands/hack";
import iq from "@commands/fun/subcommands/iq";
import nitro from "@commands/fun/subcommands/nitro";
import oogway from "@commands/fun/subcommands/oogway";
import pepeSign from "@commands/fun/subcommands/pepeSign";
import relationship from "@commands/fun/subcommands/relationship";
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
