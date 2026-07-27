import autoplay from "@commands/music/subcommands/autoplay";
import filters from "@commands/music/subcommands/filters";
import forward from "@commands/music/subcommands/forward";
import join from "@commands/music/subcommands/join";
import leave from "@commands/music/subcommands/leave";
import playSkip from "@commands/music/subcommands/playSkip";
import playTop from "@commands/music/subcommands/playTop";
import previous from "@commands/music/subcommands/previous";
import radio from "@commands/music/subcommands/radio";
import repeat from "@commands/music/subcommands/repeat";
import rewind from "@commands/music/subcommands/rewind";
import seek from "@commands/music/subcommands/seek";
import shuffle from "@commands/music/subcommands/shuffle";
import skipTo from "@commands/music/subcommands/skipTo";
import tts from "@commands/music/subcommands/tts";
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
