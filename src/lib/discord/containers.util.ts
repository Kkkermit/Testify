import {
	type ActionRowBuilder,
	type ButtonBuilder,
	ContainerBuilder,
	MediaGalleryBuilder,
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

/** Components V2 — layout built from components rather than an embed. */

export interface ContainerMessage {
	components: ContainerBuilder[];
	flags: MessageFlags.IsComponentsV2;
}

/** Wraps a container into a payload that is safe to `reply()`, `update()` or `send()`. */
export function containerMessage(container: ContainerBuilder): ContainerMessage {
	return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export function text(markdown: string): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(markdown);
}

/** A horizontal rule. */
export function divider(options: { large?: boolean; spacer?: boolean } = {}): SeparatorBuilder {
	return new SeparatorBuilder()
		.setDivider(options.spacer !== true)
		.setSpacing(options.large === true ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
}

/** Text with a button on the right — the layout an embed cannot do. */
export function sectionWithButton(markdown: string, accessory: ButtonBuilder): SectionBuilder {
	return new SectionBuilder().addTextDisplayComponents(text(markdown)).setButtonAccessory(accessory);
}

/** Text with a small image on the right, for album art and avatars. */
export function sectionWithThumbnail(markdown: string, imageUrl: string, description?: string): SectionBuilder {
	const thumbnail = new ThumbnailBuilder().setURL(imageUrl);
	if (description !== undefined) thumbnail.setDescription(description);

	return new SectionBuilder().addTextDisplayComponents(text(markdown)).setThumbnailAccessory(thumbnail);
}

export type ContainerPart =
	| TextDisplayBuilder
	| SectionBuilder
	| SeparatorBuilder
	| MediaGalleryBuilder
	| ActionRowBuilder<MessageActionRowComponentBuilder>;

/**
 * Builds a container, colour-coded by category so V2 messages stay visually consistent with the embeds they sit
 * alongside.
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

/** `setAccentColor` needs a number, but the theme stores named colours for embeds. */
function resolveAccent(category: Category): number {
	const colour = categoryColour(category);
	return typeof colour === "number" ? colour : 0x5865f2;
}
