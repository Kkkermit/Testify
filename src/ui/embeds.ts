import { type APIEmbedField, type ColorResolvable, EmbedBuilder } from "discord.js";
import { LIMITS } from "../config/constants";
import { Category } from "../config/categories";
import { theme } from "../config/theme";
import { truncate } from "./format";

export interface EmbedOptions {
	category?: Category | undefined;
	color?: ColorResolvable | undefined;
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
 * The house style, in one place. Every embed in the bot comes from here or from a
 * builder returned by here — there are no inline `new EmbedBuilder()` chains in
 * feature code.
 */
export function embed(options: EmbedOptions): EmbedBuilder {
	const builder = new EmbedBuilder().setColor(resolveColor(options));

	if (options.title !== undefined) {
		builder.setTitle(truncate(`${options.title} ${theme.emoji.arrow}`, LIMITS.embedTitle));
	}
	if (options.description !== undefined) {
		builder.setDescription(truncate(options.description, LIMITS.embedDescription));
	}
	if (options.url !== undefined) builder.setURL(options.url);
	if (options.fields !== undefined) builder.addFields(...options.fields.map(clampField));
	if (options.thumbnail !== undefined) builder.setThumbnail(options.thumbnail);
	if (options.image !== undefined) builder.setImage(options.image);

	builder.setAuthor(
		options.author
			? {
					name: truncate(options.author.name, LIMITS.embedTitle),
					...(options.author.iconURL !== undefined ? { iconURL: options.author.iconURL } : {}),
					...(options.author.url !== undefined ? { url: options.author.url } : {}),
				}
			: { name: `${theme.brand.name} ${theme.brand.credit}` },
	);

	builder.setFooter({
		// Discord rejects an empty footer, so a blank string falls back to the credit.
		text: truncate(
			options.footer !== undefined && options.footer.length > 0 ? options.footer : theme.brand.credit,
			LIMITS.embedTitle,
		),
		...(options.footerIcon !== undefined ? { iconURL: options.footerIcon } : {}),
	});

	if (options.timestamp !== false) builder.setTimestamp();

	return builder;
}

function resolveColor(options: EmbedOptions): ColorResolvable {
	if (options.color !== undefined) return options.color;
	if (options.category !== undefined) return categoryColorOf(options.category);
	return theme.colors.default;
}

function categoryColorOf(category: Category): ColorResolvable {
	// Imported lazily through the map to keep this module free of a cycle with config.
	return categoryColors[category];
}

const categoryColors: Record<Category, ColorResolvable> = {
	[Category.Economy]: "DarkOrange",
	[Category.Moderation]: "DarkRed",
	[Category.Community]: "Green",
	[Category.Info]: "LuminousVividPink",
	[Category.Fun]: "Yellow",
	[Category.Music]: "Gold",
	[Category.Levelling]: "Fuchsia",
	[Category.MiniGames]: "Orange",
	[Category.Settings]: "Blue",
	[Category.Tickets]: "Blurple",
	[Category.Giveaway]: "Aqua",
	[Category.Profile]: "Navy",
	[Category.Integrations]: "#1db954",
	[Category.Owner]: "DarkGrey",
	[Category.Developer]: "Aqua",
	[Category.Help]: "Blurple",
};

function clampField(field: APIEmbedField): APIEmbedField {
	return {
		...field,
		name: truncate(field.name, LIMITS.embedTitle),
		value: truncate(field.value, LIMITS.embedFieldValue),
	};
}

/** Red, ❌-prefixed. Use for every user-facing failure. */
export function errorEmbed(message: string): EmbedBuilder {
	return embed({ color: theme.colors.error, description: `${theme.emoji.error} ${message}` });
}

export function successEmbed(message: string): EmbedBuilder {
	return embed({ color: theme.colors.success, description: `${theme.emoji.success} ${message}` });
}

export function warningEmbed(message: string): EmbedBuilder {
	return embed({ color: theme.colors.warning, description: `${theme.emoji.warning} ${message}` });
}

export function infoEmbed(message: string): EmbedBuilder {
	return embed({ color: theme.colors.info, description: `${theme.emoji.info} ${message}` });
}

/** Appends "Page 2 of 5" without clobbering existing footer text. */
export function withPageFooter(builder: EmbedBuilder, page: number, total: number): EmbedBuilder {
	const existing = builder.data.footer?.text;
	const pageText = `Page ${page + 1} of ${Math.max(1, total)}`;
	return builder.setFooter({ text: existing ? `${pageText} • ${existing}` : pageText });
}
