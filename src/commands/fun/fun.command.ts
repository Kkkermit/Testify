import ascii from "@commands/fun/subcommands/ascii.command";
import dadJoke from "@commands/fun/subcommands/dadJoke.command";
import fakeTweet from "@commands/fun/subcommands/fakeTweet.command";
import hack from "@commands/fun/subcommands/hack.command";
import iq from "@commands/fun/subcommands/iq.command";
import nitro from "@commands/fun/subcommands/nitro.command";
import oogway from "@commands/fun/subcommands/oogway.command";
import pepeSign from "@commands/fun/subcommands/pepeSign.command";
import relationship from "@commands/fun/subcommands/relationship.command";
import { asSubcommand, defineCommand } from "@core/command";

/** Discord allows an application 100 commands, so related ones live together here. */
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
