import autoplay from "@commands/music/subcommands/autoplay.slash";
import filters from "@commands/music/subcommands/filters.slash";
import forward from "@commands/music/subcommands/forward.slash";
import join from "@commands/music/subcommands/join.slash";
import leave from "@commands/music/subcommands/leave.slash";
import playSkip from "@commands/music/subcommands/playSkip.slash";
import playTop from "@commands/music/subcommands/playTop.slash";
import previous from "@commands/music/subcommands/previous.slash";
import radio from "@commands/music/subcommands/radio.slash";
import repeat from "@commands/music/subcommands/repeat.slash";
import rewind from "@commands/music/subcommands/rewind.slash";
import seek from "@commands/music/subcommands/seek.slash";
import shuffle from "@commands/music/subcommands/shuffle.slash";
import skipTo from "@commands/music/subcommands/skipTo.slash";
import tts from "@commands/music/subcommands/tts.slash";
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
