import { asSubcommand, defineCommand } from "../../core/command";
import advice from "./subcommands/advice";
import animalFacts from "./subcommands/animalFacts";
import meme from "./subcommands/meme";
import minecraft from "./subcommands/minecraft";
import translate from "./subcommands/translate";
import wiki from "./subcommands/wiki";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each file in `subcommands/` is an ordinary command definition; the
 * loader only registers files sitting directly in a category folder, so they
 * appear only as part of this one.
 *
 * `t?meme` still works: a folded-in command keeps its own name as a prefix alias.
 */
export default defineCommand({
	name: "lookup",
	description: "Looks something up for you.",
	category: "community",

	subcommands: [
		asSubcommand(advice),
		asSubcommand(animalFacts, ["animalfact"]),
		asSubcommand(meme),
		asSubcommand(minecraft),
		asSubcommand(translate),
		asSubcommand(wiki),
	],
});
