import {
	type ActionRowBuilder,
	type ButtonBuilder,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	type MessageActionRowComponentBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { type Category } from "@config/categories";
import { categoryColour } from "@config/theme";

/**
 * Components V2 — layout built from components rather than an embed.
 *
 * An embed is one fixed shape: title, description, fields, one thumbnail, one
 * image, all of it above the buttons. A container holds text, separators,
 * images and buttons **interleaved**, so a control can sit beside the thing it
 * acts on instead of in a row underneath everything.
 *
 * Two rules Discord enforces, both of which are easy to get wrong:
 *
 * 1. A message using V2 **must** set `MessageFlags.IsComponentsV2`.
 * 2. That flag makes `content` and `embeds` illegal on the same message — the
 *    container is the whole payload.
 *
 * `containerMessage()` handles both, so a caller cannot send a half-converted
 * message that Discord rejects at runtime.
 */

export interface ContainerMessage {
	components: ContainerBuilder[];
	flags: MessageFlags.IsComponentsV2;
}

/** Wraps a container into a payload that is safe to `reply()`, `update()` or `send()`. */
export function containerMessage(container: ContainerBuilder): ContainerMessage {
	return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/** Markdown text. The V2 replacement for an embed description. */
export function text(markdown: string): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(markdown);
}

/** A horizontal rule. `spacer` draws no line, just breathing room. */
export function divider(options: { large?: boolean; spacer?: boolean } = {}): SeparatorBuilder {
	return new SeparatorBuilder()
		.setDivider(options.spacer !== true)
		.setSpacing(options.large === true ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
}

/**
 * Text with a button on the right — the layout an embed cannot do.
 *
 * This is the whole reason to reach for V2: a row of "buy" buttons under a list
 * makes the reader match button to item by counting, whereas a section puts the
 * control next to what it acts on.
 */
export function sectionWithButton(markdown: string, accessory: ButtonBuilder): SectionBuilder {
	return new SectionBuilder().addTextDisplayComponents(text(markdown)).setButtonAccessory(accessory);
}

/** Text with a small image on the right, for album art and avatars. */
export function sectionWithThumbnail(markdown: string, imageUrl: string, description?: string): SectionBuilder {
	const thumbnail = new ThumbnailBuilder().setURL(imageUrl);
	if (description !== undefined) thumbnail.setDescription(description);

	return new SectionBuilder().addTextDisplayComponents(text(markdown)).setThumbnailAccessory(thumbnail);
}

/** One or more full-width images. */
export function gallery(...urls: string[]): MediaGalleryBuilder {
	return new MediaGalleryBuilder().addItems(...urls.map((url) => new MediaGalleryItemBuilder().setURL(url)));
}

export type ContainerPart =
	| TextDisplayBuilder
	| SectionBuilder
	| SeparatorBuilder
	| MediaGalleryBuilder
	| ActionRowBuilder<MessageActionRowComponentBuilder>;

/**
 * Builds a container, colour-coded by category so V2 messages stay visually
 * consistent with the embeds they sit alongside.
 */
export function container(options: { category?: Category; parts: ContainerPart[] }): ContainerBuilder {
	const built = new ContainerBuilder();

	if (options.category !== undefined) built.setAccentColor(resolveAccent(options.category));

	for (const part of options.parts) {
		if (part instanceof TextDisplayBuilder) built.addTextDisplayComponents(part);
		else if (part instanceof SectionBuilder) built.addSectionComponents(part);
		else if (part instanceof SeparatorBuilder) built.addSeparatorComponents(part);
		else if (part instanceof MediaGalleryBuilder) built.addMediaGalleryComponents(part);
		else built.addActionRowComponents(part);
	}

	return built;
}

/**
 * `setAccentColor` needs a number, but the theme stores named colours for embeds.
 * Anything that is not already numeric falls back rather than throwing, since a
 * colour is never worth failing a message over.
 */
function resolveAccent(category: Category): number {
	const colour = categoryColour(category);
	return typeof colour === "number" ? colour : 0x5865f2;
}
