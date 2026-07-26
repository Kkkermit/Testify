import { type EmbedBuilder } from "discord.js";
import {
	ALL_CATEGORIES,
	type Category,
	categoryEmoji,
	categoryLabel,
	HIDDEN_CATEGORIES,
	isCategory,
} from "../../../config/categories";
import { theme } from "../../../config/theme";
import { type TestifyClient } from "../../../core/client";
import { allSubcommands, type SharedCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";
import { truncate } from "../../../ui/format";

export interface HelpEntry {
	name: string;
	description: string;
	surfaces: string;
	aliases: string[];
	subcommands: string[];
}

/**
 * One registry, one grouping function. The previous code had two near-identical
 * "commands by category" helpers and six near-identical embed builders.
 */
export function visibleCommands(client: TestifyClient): SharedCommand[] {
	return [...client.commands.values()].filter(
		(command) => !HIDDEN_CATEGORIES.includes(command.category) && command.underDevelopment !== true,
	);
}

export function commandsInCategory(client: TestifyClient, category: Category): HelpEntry[] {
	return visibleCommands(client)
		.filter((command) => command.category === category)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((command) => ({
			name: command.name,
			description: command.description,
			surfaces: command.surfaces.map((surface) => (surface === "slash" ? "/" : "prefix")).join(" · "),
			aliases: command.aliases ?? [],
			subcommands: allSubcommands(command).map((sub) => sub.name),
		}));
}

export function populatedCategories(client: TestifyClient): Category[] {
	const counts = new Map<Category, number>();
	for (const command of visibleCommands(client)) {
		counts.set(command.category, (counts.get(command.category) ?? 0) + 1);
	}
	return ALL_CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0);
}

export function overviewEmbed(client: TestifyClient, prefix: string): EmbedBuilder {
	const categories = populatedCategories(client);

	return embed({
		category: "help",
		title: `${client.user?.username ?? theme.brand.name} help`,
		description: [
			`I have **${visibleCommands(client).length}** commands across **${categories.length}** categories.`,
			"",
			`Slash commands start with \`/\`. Prefix commands use \`${prefix}\`.`,
			"",
			"Pick a category from the menu below.",
		].join("\n"),
		fields: categories.map((category) => ({
			name: `${categoryEmoji[category]} ${categoryLabel[category]}`,
			value: `${commandsInCategory(client, category).length} command(s)`,
			inline: true,
		})),
		thumbnail: client.user?.displayAvatarURL(),
	});
}

export function categoryEmbed(client: TestifyClient, category: Category, prefix: string): EmbedBuilder {
	const entries = commandsInCategory(client, category);

	return embed({
		category,
		title: `${categoryEmoji[category]} ${categoryLabel[category]}`,
		description: `Prefix commands use \`${prefix}\`.`,
		fields: entries.slice(0, 25).map((entry) => ({
			name: `${entry.name}${entry.aliases.length > 0 ? ` (${entry.aliases.join(", ")})` : ""}`,
			value: truncate(
				[
					entry.description,
					entry.subcommands.length > 0 ? `Subcommands: ${entry.subcommands.join(", ")}` : "",
					`Available on: ${entry.surfaces}`,
				]
					.filter(Boolean)
					.join("\n"),
				1_000,
			),
			inline: false,
		})),
		footer: `${entries.length} command(s) in this category`,
	});
}

export function commandEmbed(command: SharedCommand, prefix: string): EmbedBuilder {
	const subcommands = allSubcommands(command);

	return embed({
		category: command.category,
		title: `${command.name}`,
		description: command.description,
		fields: [
			{ name: "Category", value: categoryLabel[command.category], inline: true },
			{
				name: "Usage",
				value: command.surfaces
					.map((surface) => (surface === "slash" ? `\`/${command.name}\`` : `\`${prefix}${command.name}\``))
					.join(" · "),
				inline: true,
			},
			...(command.aliases && command.aliases.length > 0
				? [{ name: "Aliases", value: command.aliases.map((alias) => `\`${alias}\``).join(", "), inline: true }]
				: []),
			...(command.options && command.options.length > 0
				? [
						{
							name: "Options",
							value: command.options
								.map(
									(option) =>
										`\`${option.name}\`${option.required === true ? " (required)" : ""} — ${option.description}`,
								)
								.join("\n"),
						},
					]
				: []),
			...(subcommands.length > 0
				? [
						{
							name: "Subcommands",
							value: subcommands.map((sub) => `\`${sub.name}\` — ${sub.description}`).join("\n"),
						},
					]
				: []),
			...(command.cooldownMs !== undefined
				? [{ name: "Cooldown", value: `${Math.round(command.cooldownMs / 1_000)}s`, inline: true }]
				: []),
		],
	});
}

export function resolveCategory(value: string): Category | null {
	return isCategory(value) ? value : null;
}
