import {
	type AnySelectMenuInteraction,
	type ButtonInteraction,
	type MessageComponentInteraction,
	type ModalSubmitInteraction,
} from "discord.js";
import { type TestifyClient } from "./client";

export type ComponentInteraction = MessageComponentInteraction | ModalSubmitInteraction;

export interface ComponentContext<I extends ComponentInteraction = ComponentInteraction> {
	readonly client: TestifyClient;
	readonly interaction: I;
	readonly action: string;
	readonly args: string[];
}

export type ButtonContext = ComponentContext<ButtonInteraction>;
export type SelectContext = ComponentContext<AnySelectMenuInteraction>;
export type ModalContext = ComponentContext<ModalSubmitInteraction>;

export interface ComponentHandler {
	namespace: string;
	/**
	 * When true, only the user whose ID is the last custom-ID argument may use the
	 * component. Replaces the hand-rolled "is this your button?" checks that some
	 * handlers did and others forgot.
	 */
	ownerOnly?: boolean;
	handle(ctx: ComponentContext): Promise<void>;
}

export function defineComponent(handler: ComponentHandler): ComponentHandler {
	return handler;
}
