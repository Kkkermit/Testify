import {
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

export type ContainerPart =
	| TextDisplayBuilder
	| SectionBuilder
	| SeparatorBuilder
	| MediaGalleryBuilder
	| ActionRowBuilder<MessageActionRowComponentBuilder>;
