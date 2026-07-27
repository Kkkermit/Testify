import { asSubcommand, defineCommand } from "../../core/command";
import advice from "./_advice";
import animalFacts from "./_animalFacts";
import meme from "./_meme";
import minecraft from "./_minecraft";
import translate from "./_translate";
import wiki from "./_wiki";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each `_name.ts` file beside this one is a normal command definition —
 * the leading underscore just stops the loader registering it twice.
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
