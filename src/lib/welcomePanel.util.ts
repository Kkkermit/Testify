import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { button, channelSelect, row } from "@lib/components.util";
import {
	container,
	type ContainerMessage,
	containerMessage,
	type ContainerPart,
	divider,
	text,
} from "@lib/containers.util";
import { type WelcomeConfig, WELCOME_PLACEHOLDERS } from "@lib/welcome.util";

/** Setting up the welcome system, as one screen you read and press. */

export const WELCOME_PANEL_ID = "welcome";

export interface WelcomePanelState {
	/** `null` before anything is configured. */
	config: WelcomeConfig | null;
	/** A one-line result from the last press. */
	note?: string;
}

const STYLE_LABELS = {
	text: "Plain message",
	embed: "Embed",
	card: "Image card",
} as const;

function control(action: string, ownerId: string, ...args: (string | number)[]): string {
	return customId(WELCOME_PANEL_ID, action, ...args, ownerId);
}

function summary(config: WelcomeConfig | null): string {
	if (config === null) {
		return (
			"## 👋 Welcome messages\n" +
			"Nobody is greeted yet. Pick a channel below and I will start.\n" +
			"-# You can change the wording and the look afterwards."
		);
	}

	return (
		"## 👋 Welcome messages\n" +
		`New members are greeted in <#${config.channelId}> as a **${STYLE_LABELS[config.style].toLowerCase()}**.\n` +
		`-# ${backgroundNote(config)}`
	);
}

/** Only the image card has a background, so the other styles get told what they would gain by switching. */
function backgroundNote(config: WelcomeConfig): string {
	if (config.style !== "card") return "Switch to the image card for a picture with their avatar.";

	return config.hasBackground ? "Using your background image." : "Using the default background.";
}

function placeholderHelp(): string {
	const rows = WELCOME_PLACEHOLDERS.map((entry) => `\`${entry.token}\` — ${entry.describes}`).join("\n");
	return `**Placeholders**\n${rows}`;
}

export function welcomePanel(state: WelcomePanelState, ownerId: string): ContainerMessage {
	const { config } = state;
	const off = config === null;

	const parts: ContainerPart[] = [text(summary(config))];
	if (state.note !== undefined) parts.push(text(`-# ${state.note}`));

	parts.push(divider());

	if (config !== null) {
		parts.push(text(`**The message**\n>>> ${config.message}`), divider({ spacer: true }), text(placeholderHelp()));
	}

	parts.push(
		divider(),
		text("**Greeting channel**\n-# Where the welcome is posted when someone joins."),
		row(
			channelSelect({
				id: control("channel", ownerId),
				placeholder: off ? "Greet new members in…" : "Move the greeting somewhere else…",
				...(config !== null ? { defaultChannelIds: [config.channelId] } : {}),
			}),
		),
		row(
			button({
				id: control("style", ownerId, "text"),
				label: STYLE_LABELS.text,
				style: config?.style === "text" ? ButtonStyle.Primary : ButtonStyle.Secondary,
				disabled: off || config.style === "text",
			}),
			button({
				id: control("style", ownerId, "embed"),
				label: STYLE_LABELS.embed,
				style: config?.style === "embed" ? ButtonStyle.Primary : ButtonStyle.Secondary,
				disabled: off || config.style === "embed",
			}),
			button({
				id: control("style", ownerId, "card"),
				label: STYLE_LABELS.card,
				style: config?.style === "card" ? ButtonStyle.Primary : ButtonStyle.Secondary,
				disabled: off || config.style === "card",
			}),
		),
		row(
			button({
				id: control("edit", ownerId),
				label: "Edit the message",
				style: ButtonStyle.Success,
				disabled: off,
			}),
			button({ id: control("preview", ownerId), label: "Preview", disabled: off }),
			button({
				id: control("clear-bg", ownerId),
				label: "Remove background",
				// Only meaningful once a background exists and the card is what is shown.
				disabled: off || !config.hasBackground,
			}),
			button({
				id: control("off", ownerId),
				label: "Turn off",
				style: ButtonStyle.Danger,
				disabled: off,
			}),
		),
	);

	if (config !== null && config.style === "card") {
		parts.push(
			text(
				"-# Upload your own background with `/welcome background` — a PNG or JPG, ideally 1024×400. " +
					"Without one the card uses the default gradient.",
			),
		);
	}

	return containerMessage(container({ category: "settings", parts }));
}
