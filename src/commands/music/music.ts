import { asSubcommand, defineCommand } from "../../core/command";
import autoplay from "./subcommands/autoplay";
import filters from "./subcommands/filters";
import forward from "./subcommands/forward";
import join from "./subcommands/join";
import leave from "./subcommands/leave";
import playSkip from "./subcommands/playSkip";
import playTop from "./subcommands/playTop";
import previous from "./subcommands/previous";
import radio from "./subcommands/radio";
import repeat from "./subcommands/repeat";
import rewind from "./subcommands/rewind";
import seek from "./subcommands/seek";
import shuffle from "./subcommands/shuffle";
import skipTo from "./subcommands/skipTo";
import tts from "./subcommands/tts";

/**
 * Discord allows an application 100 commands, so related ones live together
 * here. Each file in `subcommands/` is an ordinary command definition; the
 * loader only registers files sitting directly in a category folder, so they
 * appear only as part of this one.
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
