import { z } from "zod";
import { snowflake } from "./schemas";

/**
 * Running an owner command from the browser.
 *
 * This is the one place a `CommandInput` adapter is the right answer — owner commands are one-shot and
 * embed-based, so capturing what they reply with and rendering it as a card loses nothing. The panel commands
 * are not here and never will be: a Components V2 tree serialised to JSON is not a settings page, which is why
 * every other feature is promoted to its own screen instead.
 */

export const RUN_LIMITS = { maxStringArg: 2_000, maxArgs: 25 } as const;

/** What a command replied with, flattened to something a browser can draw. */
export type RunOutput =
	| { kind: "text"; content: string }
	| {
			kind: "embed";
			title: string | null;
			description: string | null;
			colour: number | null;
			fields: { name: string; value: string; inline: boolean }[];
			footer: string | null;
	  }
	/** Something that only works inside Discord. Named rather than silently dropped. */
	| { kind: "dropped"; what: string };

export interface CommandRunResult {
	command: string;
	subcommand: string | null;
	ranAt: string;
	outputs: RunOutput[];
	/** True when anything was dropped, so the page can say so once rather than per block. */
	degraded: boolean;
}

/** An argument value as it survives JSON. Everything is coerced against the command's own declared type. */
const argValue = z.union([z.string().max(RUN_LIMITS.maxStringArg), z.number(), z.boolean()]);

export const commandRunRequest = z.object({
	/** Required by a `guildOnly` command, ignored by the rest. */
	guildId: snowflake.nullish(),
	subcommand: z
		.string()
		.regex(/^[\w-]{1,32}$/, "is not a subcommand name")
		.nullish(),
	args: z.record(z.string(), argValue).refine((args) => Object.keys(args).length <= RUN_LIMITS.maxArgs, {
		message: `cannot carry more than ${String(RUN_LIMITS.maxArgs)} arguments`,
	}),
});

export type CommandRunRequest = z.infer<typeof commandRunRequest>;

export const commandNameParam = z.object({
	name: z.string().regex(/^[\w-]{1,32}$/, "is not a command name"),
});
