import { type APIEmbedField, type ColorResolvable, EmbedBuilder } from "discord.js";
import { type Category } from "@config/categories";
import { LIMITS } from "@config/constants";
import { categoryColour, theme } from "@config/theme";
import { truncate } from "@lib/format.util";

export interface EmbedOptions {
	category?: Category | undefined;
	colour?: ColorResolvable | undefined;
	title?: string | undefined;
	description?: string | undefined;
	url?: string | undefined;
	fields?: APIEmbedField[] | undefined;
	thumbnail?: string | undefined;
	image?: string | undefined;
	footer?: string | undefined;
	footerIcon?: string | undefined;
	author?: { name: string; iconURL?: string | undefined; url?: string | undefined } | undefined;
	timestamp?: boolean | undefined;
}

/**
 * Every embed in the bot comes from here, so restyling the whole thing is a
 * change to `theme.ts` rather than a search across two hundred files.
 */
export function embed(options: EmbedOptions): EmbedBuilder {
	const builder = new EmbedBuilder().setColor(pickColour(options));

	if (options.title !== undefined) builder.setTitle(truncate(options.title, LIMITS.embedTitle));
	if (options.description !== undefined) builder.setDescription(truncate(options.description, LIMITS.embedDescription));
	if (options.url !== undefined) builder.setURL(options.url);
	if (options.fields !== undefined) builder.addFields(...options.fields.map(clampField));
	if (options.thumbnail !== undefined) builder.setThumbnail(options.thumbnail);
	if (options.image !== undefined) builder.setImage(options.image);

	if (options.author) {
		builder.setAuthor({
			name: truncate(options.author.name, LIMITS.embedTitle),
			...(options.author.iconURL !== undefined ? { iconURL: options.author.iconURL } : {}),
			...(options.author.url !== undefined ? { url: options.author.url } : {}),
		});
	}

	builder.setFooter({
		// Discord rejects an empty footer, so a blank string falls back to the name.
		text: truncate(
			options.footer !== undefined && options.footer !== "" ? options.footer : theme.name,
			LIMITS.embedTitle,
		),
		...(options.footerIcon !== undefined ? { iconURL: options.footerIcon } : {}),
	});

	if (options.timestamp !== false) builder.setTimestamp();

	return builder;
}

function pickColour(options: EmbedOptions): ColorResolvable {
	if (options.colour !== undefined) return options.colour;
	if (options.category !== undefined) return categoryColour(options.category);
	return theme.colours.default;
}

function clampField(field: APIEmbedField): APIEmbedField {
	return {
		...field,
		name: truncate(field.name, LIMITS.embedTitle),
		value: truncate(field.value, LIMITS.embedFieldValue),
	};
}

export function errorEmbed(message: string): EmbedBuilder {
	return embed({ colour: theme.colours.error, description: `${theme.emoji.error} ${message}` });
}

export function successEmbed(message: string): EmbedBuilder {
	return embed({ colour: theme.colours.success, description: `${theme.emoji.success} ${message}` });
}

export function warningEmbed(message: string): EmbedBuilder {
	return embed({ colour: theme.colours.warning, description: `${theme.emoji.warning} ${message}` });
}

export function infoEmbed(message: string): EmbedBuilder {
	return embed({ colour: theme.colours.info, description: `${theme.emoji.info} ${message}` });
}

/** Appends "Page 2 of 5" without clobbering existing footer text. */
export function withPageFooter(builder: EmbedBuilder, page: number, total: number): EmbedBuilder {
	const existing = builder.data.footer?.text;
	const pageText = `Page ${page + 1} of ${Math.max(1, total)}`;
	return builder.setFooter({ text: existing ? `${pageText} • ${existing}` : pageText });
}
