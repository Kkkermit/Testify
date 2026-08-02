import { z } from "zod";

/**
 * Which commands are switched off, and the rules about what may be.
 *
 * Shared because the browser has to grey out the same switches the API refuses — a form that offers to disable
 * `/help` and then gets a 400 is worse than one that explains why it cannot.
 */

/**
 * Commands that can never be switched off anywhere.
 *
 * `/help` is how somebody finds out what is left, and a server that disabled it would have no way back except
 * the dashboard. Everything else is fair game.
 */
export const ALWAYS_ENABLED = ["help"] as const;

export function isAlwaysEnabled(name: string): boolean {
	return (ALWAYS_ENABLED as readonly string[]).includes(name);
}

/** A command name as the loader knows it: lowercase, hyphens, nothing exotic. */
export const commandName = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "is not a command name");

export const commandTogglePut = z.object({
	disabled: z
		.array(commandName)
		.max(200)
		.refine((names) => !names.some(isAlwaysEnabled), "cannot switch off a command the bot needs"),
});

export type CommandTogglePut = z.infer<typeof commandTogglePut>;

export interface CommandToggleState {
	/** Off in this scope. */
	disabled: string[];
	/**
	 * Off bot-wide, which a server cannot change. Only sent on the guild view, where it explains a switch that
	 * is on the server's list but still shows as unavailable.
	 */
	disabledGlobally: string[];
	/** Names that may never be switched off, so the form can disable those switches rather than refuse later. */
	locked: string[];
}

export type CommandAvailability = "on" | "off-here" | "off-everywhere" | "locked";

/** What a switch should show, given both lists. Bot-wide wins: a server cannot re-enable what the owner turned off. */
export function availabilityOf(
	name: string,
	{ disabled, disabledGlobally }: Pick<CommandToggleState, "disabled" | "disabledGlobally">,
): CommandAvailability {
	if (isAlwaysEnabled(name)) return "locked";
	if (disabledGlobally.includes(name)) return "off-everywhere";

	return disabled.includes(name) ? "off-here" : "on";
}

export function toggleName(disabled: string[], name: string): string[] {
	return disabled.includes(name) ? disabled.filter((each) => each !== name) : [...disabled, name].toSorted();
}
