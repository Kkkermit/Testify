import { type MessageComponentInteraction, type ModalSubmitInteraction } from "discord.js";
import { type TestifyClient } from "./client";

export type ComponentInteraction = MessageComponentInteraction | ModalSubmitInteraction;

/**
 * Handles the buttons, select menus and modals for one feature.
 *
 * Custom IDs look like `shop:buy:item_42`. The first part picks the handler, the
 * second is passed as `action`, and anything after that is passed as `args`.
 */
export interface Button {
	/** The first part of the custom ID. Must be unique across the bot. */
	id: string;
	/**
	 * When true, only the user whose ID is the last argument may use it. Put the
	 * user's ID last in the custom ID when you build the component.
	 */
	ownerOnly?: boolean;
	run(interaction: ComponentInteraction, context: ButtonContext): Promise<void>;
}

export interface ButtonContext {
	client: TestifyClient;
	/** The second part of the custom ID. */
	action: string;
	/** Everything after the action. */
	args: string[];
}

export function defineButton(button: Button): Button {
	return button;
}

const SEPARATOR = ":";

/**
 * Builds a custom ID. Throws above Discord's 100-character limit so you find out
 * here rather than when the whole message is rejected.
 */
export function customId(id: string, action: string, ...args: (string | number)[]): string {
	const parts = [id, action, ...args.map(String)];

	for (const part of parts) {
		if (part.includes(SEPARATOR)) throw new Error(`A custom ID part cannot contain "${SEPARATOR}": ${part}`);
	}

	const built = parts.join(SEPARATOR);
	if (built.length > 100) throw new Error(`Custom ID is too long (${built.length}/100): ${built}`);

	return built;
}

export function parseCustomId(raw: string): { id: string; action: string; args: string[] } {
	const [id = "", action = "", ...args] = raw.split(SEPARATOR);
	return { id, action, args };
}
