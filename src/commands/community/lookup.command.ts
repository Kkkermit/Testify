import advice from "@commands/community/subcommands/advice.command";
import animalFacts from "@commands/community/subcommands/animalFacts.command";
import meme from "@commands/community/subcommands/meme.command";
import minecraft from "@commands/community/subcommands/minecraft.command";
import translate from "@commands/community/subcommands/translate.command";
import wiki from "@commands/community/subcommands/wiki.command";
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
