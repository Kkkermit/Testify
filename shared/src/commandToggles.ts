import { z } from "zod";

/** Commands that can never be switched off: `/help` is how somebody finds out what is left, and nobody may be kept from deleting their own data. */
export const ALWAYS_ENABLED = ["help", "delete-my-data"] as const;

export function isAlwaysEnabled(name: string): boolean {
	return (ALWAYS_ENABLED as readonly string[]).includes(name);
}

export const commandName = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "is not a command name");

export const commandTogglePut = z.object({
	disabled: z
		.array(commandName)
		.max(200)
		.refine((names) => !names.some(isAlwaysEnabled), "cannot switch off a command the bot needs"),
});

export type CommandTogglePut = z.infer<typeof commandTogglePut>;

export interface CommandToggleState {
	disabled: string[];
	/** Off bot-wide, which a server cannot change; only sent on the guild view. */
	disabledGlobally: string[];
	locked: string[];
}

export type CommandAvailability = "on" | "off-here" | "off-everywhere" | "locked";

/** Bot-wide wins: a server cannot re-enable what the owner turned off. */
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
