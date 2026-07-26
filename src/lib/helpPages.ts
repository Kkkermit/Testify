import { type EmbedBuilder } from "discord.js";
import {
	ALL_CATEGORIES,
	type Category,
	categoryEmoji,
	categoryLabel,
	HIDDEN_CATEGORIES,
	isCategory,
} from "../config/categories";
import { theme } from "../config/theme";
import { type TestifyClient } from "../core/client";
import { type Command, subcommandsOf } from "../core/command";
import { embed } from "./embeds";
import { truncate } from "./format";

export function visibleCommands(client: TestifyClient): Command[] {
	return [...client.commands.values()].filter((command) => !HIDDEN_CATEGORIES.includes(command.category));
}

export function commandsInCategory(client: TestifyClient, category: Category): Command[] {
	return visibleCommands(client)
		.filter((command) => command.category === category)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function populatedCategories(client: TestifyClient): Category[] {
	const used = new Set(visibleCommands(client).map((command) => command.category));
	return ALL_CATEGORIES.filter((category) => used.has(category));
}

export function overviewEmbed(client: TestifyClient): EmbedBuilder {
	const categories = populatedCategories(client);

	return embed({
		category: "info",
		title: `${client.user?.username ?? theme.name} help`,
		description: [
			`I have **${visibleCommands(client).length}** commands across **${categories.length}** categories.`,
			"",
			"Pick a category from the menu below.",
		].join("\n"),
		fields: categories.map((category) => ({
			name: `${categoryEmoji(category)} ${categoryLabel(category)}`,
			value: `${commandsInCategory(client, category).length} command(s)`,
			inline: true,
		})),
		thumbnail: client.user?.displayAvatarURL(),
	});
}

export function categoryEmbed(client: TestifyClient, category: Category): EmbedBuilder {
	const commands = commandsInCategory(client, category);

	return embed({
		category,
		title: `${categoryEmoji(category)} ${categoryLabel(category)}`,
		fields: commands.slice(0, 25).map((command) => {
			const subcommands = subcommandsOf(command).map((sub) => sub.name);
			return {
				name: `/${command.name}`,
				value: truncate(
					[command.description, subcommands.length > 0 ? `Subcommands: ${subcommands.join(", ")}` : ""]
						.filter(Boolean)
						.join("\n"),
					1_000,
				),
				inline: false,
			};
		}),
		footer: `${commands.length} command(s) in this category`,
	});
}

export function commandEmbed(command: Command): EmbedBuilder {
	const subcommands = subcommandsOf(command);

	return embed({
		category: command.category,
		title: `/${command.name}`,
		description: command.description,
		fields: [
			{ name: "Category", value: categoryLabel(command.category), inline: true },
			...(command.cooldown !== undefined
				? [{ name: "Cooldown", value: `${Math.round(command.cooldown / 1_000)}s`, inline: true }]
				: []),
			...(command.options?.length
				? [
						{
							name: "Options",
							value: command.options
								.map((o) => `\`${o.name}\`${o.required === true ? " (required)" : ""} — ${o.description}`)
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
		],
	});
}

export function resolveCategory(value: string): Category | null {
	return isCategory(value) ? value : null;
}
