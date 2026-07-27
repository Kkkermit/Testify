import ascii from "@commands/fun/subcommands/ascii.slash";
import dadJoke from "@commands/fun/subcommands/dadJoke.slash";
import fakeTweet from "@commands/fun/subcommands/fakeTweet.slash";
import hack from "@commands/fun/subcommands/hack.slash";
import iq from "@commands/fun/subcommands/iq.slash";
import nitro from "@commands/fun/subcommands/nitro.slash";
import oogway from "@commands/fun/subcommands/oogway.slash";
import pepeSign from "@commands/fun/subcommands/pepeSign.slash";
import relationship from "@commands/fun/subcommands/relationship.slash";
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
