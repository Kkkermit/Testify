import {
	type AttachmentBuilder,
	type EmbedBuilder,
	type ActionRowBuilder,
	type MessageActionRowComponentBuilder,
	type ContainerBuilder,
	type MessageFlags,
	type TextDisplayBuilder,
	type SectionBuilder,
	type SeparatorBuilder,
	type MediaGalleryBuilder,
} from "discord.js";

/** The types more than one module in this domain shares. */

/** What every panel returns: one embed set and its controls. */
export interface RenderedScreen {
	embeds: EmbedBuilder[];
	components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}

export interface ContainerMessage {
	components: ContainerBuilder[];
	flags: MessageFlags.IsComponentsV2;
}

/** A container message that uploads a file its components refer to, or drops the one it had with an empty list. */
export interface ContainerMessageWithFiles extends ContainerMessage {
	files?: AttachmentBuilder[];
	attachments?: [];
}

export type ContainerPart =
	| TextDisplayBuilder
	| SectionBuilder
	| SeparatorBuilder
	| MediaGalleryBuilder
	| ActionRowBuilder<MessageActionRowComponentBuilder>;
