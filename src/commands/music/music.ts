import { asSubcommand, defineCommand } from "../../core/command";
import autoplay from "./_autoplay";
import filters from "./_filters";
import forward from "./_forward";
import join from "./_join";
import leave from "./_leave";
import playSkip from "./_playSkip";
import playTop from "./_playTop";
import previous from "./_previous";
import radio from "./_radio";
import repeat from "./_repeat";
import rewind from "./_rewind";
import seek from "./_seek";
import shuffle from "./_shuffle";
import skipTo from "./_skipTo";
import tts from "./_tts";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each `_name.ts` file beside this one is a normal command definition —
 * the leading underscore just stops the loader registering it twice.
 *
 * `t?meme` still works: a folded-in command keeps its own name as a prefix alias.
 */
export default defineCommand({
	name: "music",
	description: "The rest of the music controls.",
	category: "music",

	subcommands: [
		asSubcommand(autoplay),
		asSubcommand(filters),
		asSubcommand(forward),
		asSubcommand(join),
		asSubcommand(leave),
		asSubcommand(playSkip, ["playskip", "ps"]),
		asSubcommand(playTop, ["playtop", "pt"]),
		asSubcommand(previous),
		asSubcommand(radio),
		asSubcommand(repeat, ["loop"]),
		asSubcommand(rewind),
		asSubcommand(seek),
		asSubcommand(shuffle),
		asSubcommand(skipTo, ["skipto"]),
		asSubcommand(tts),
	],
});
