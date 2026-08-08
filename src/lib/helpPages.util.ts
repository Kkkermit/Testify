import { ButtonStyle, type EmbedBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import {
	ALL_CATEGORIES,
	type Category,
	categoryEmoji,
	categoryLabel,
	HIDDEN_CATEGORIES,
	isCategory,
} from "@config/categories";
import { theme } from "@config/theme";
import { customId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { type Command, subcommandsOf } from "@core/command";
import { button, linkButton, row, select, selectRow } from "@lib/components.util";
import { dashboardUrl } from "@lib/dashboard.util";
import { embed } from "@lib/embeds.util";
import { truncate } from "@lib/format.util";

/** How the help pages are laid out. */
export type Surface = "slash" | "prefix";

export const HELP_PAGE_SIZE = 6;
export const HELP_HOME = "home";

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

export function pagesOf(client: TestifyClient, category: Category): Command[][] {
	const commands = commandsInCategory(client, category);
	const pages: Command[][] = [];

	for (let start = 0; start < commands.length; start += HELP_PAGE_SIZE) {
		pages.push(commands.slice(start, start + HELP_PAGE_SIZE));
	}

	return pages.length > 0 ? pages : [[]];
}

function usage(command: Command, surface: Surface, prefix: string): string {
	return surface === "slash" ? `/${command.name}` : `${prefix}${command.name}`;
}

/** The front page: what the bot is, how many commands, and where to get help. */
export function helpHome(client: TestifyClient, surface: Surface, prefix: string): EmbedBuilder {
	const categories = populatedCategories(client);
	const total = visibleCommands(client).length;
	const subcommands = visibleCommands(client).reduce((count, command) => count + subcommandsOf(command).length, 0);

	return embed({
		category: "info",
		title: `${client.user?.username ?? theme.name} help centre`,
		description: [
			`Everything here works as a slash command **and** with the \`${prefix}\` prefix.`,
			"",
			"Pick a category from the menu below to browse.",
		].join("\n"),
		thumbnail: client.user?.displayAvatarURL(),
		fields: [
			{
				name: "📊 Commands",
				value: `> **${total}** commands and **${subcommands}** subcommands across **${categories.length}** categories.`,
			},
			{
				name: "🔤 Prefix here",
				value: `> \`${prefix}\` — change it with \`/prefix set\`. Mentioning me works too.`,
			},
			{
				name: "📂 Categories",
				value: `> ${categories.map((category) => `${categoryEmoji(category)} **${categoryLabel(category)}**`).join(" • ")}`,
			},
			...dashboardField(client),
			{ name: "💬 Feedback", value: "> Use `/suggest` or `/bug-report` to tell me what to fix next." },
		],
		footer: `Showing ${surface === "slash" ? "slash" : "prefix"} commands`,
	});
}

/** Only when the dashboard is actually running: a link to nothing is worse than no link. */
function dashboardField(client: TestifyClient): { name: string; value: string }[] {
	const url = dashboardUrl(client.env);
	if (url === null) return [];

	return [
		{
			name: "🖥️ Set it up in a browser",
			value: `> Everything below can be configured at ${url} — sign in with Discord and pick your server.`,
		},
	];
}

export function categoryPage(
	client: TestifyClient,
	category: Category,
	page: number,
	surface: Surface,
	prefix: string,
): EmbedBuilder {
	const pages = pagesOf(client, category);
	const current = Math.min(Math.max(0, page), pages.length - 1);

	return embed({
		category,
		title: `${categoryEmoji(category)} ${categoryLabel(category)}`,
		description: `Here is everything under ${categoryLabel(category).toLowerCase()}.`,
		fields: (pages[current] ?? []).map((command) => {
			const subs = subcommandsOf(command);
			const aliases = [...(command.aliases ?? []), ...subs.flatMap((sub) => sub.aliases ?? [])];

			const lines = [`> ${command.description}`];

			if (subs.length > 0) {
				lines.push("", "**Subcommands**");
				for (const sub of subs.slice(0, 10)) {
					lines.push(`> \`${usage(command, surface, prefix)} ${sub.name}\` — ${sub.description}`);
				}
				if (subs.length > 10) lines.push(`> …and ${subs.length - 10} more.`);
			}

			if (surface === "prefix" && aliases.length > 0) {
				lines.push("", `**Also** ${aliases.map((alias) => `\`${prefix}${alias}\``).join(", ")}`);
			}

			return { name: usage(command, surface, prefix), value: truncate(lines.join("\n"), 1_000), inline: false };
		}),
		footer: `${categoryLabel(category)} • Page ${current + 1} of ${pages.length}`,
	});
}

/** Everything about one command. */
export function commandPage(command: Command, surface: Surface, prefix: string): EmbedBuilder {
	const subs = subcommandsOf(command);

	return embed({
		category: command.category,
		title: usage(command, surface, prefix),
		description: command.description,
		fields: [
			{ name: "Category", value: categoryLabel(command.category), inline: true },
			{ name: "Usage", value: `\`/${command.name}\` or \`${prefix}${command.name}\``, inline: true },
			...(command.cooldown !== undefined
				? [{ name: "Cooldown", value: `${Math.round(command.cooldown / 1_000)}s`, inline: true }]
				: []),
			...(command.aliases?.length
				? [{ name: "Aliases", value: command.aliases.map((alias) => `\`${prefix}${alias}\``).join(", ") }]
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
			...(subs.length > 0
				? [
						{
							name: "Subcommands",
							value: truncate(subs.map((sub) => `\`${sub.name}\` — ${sub.description}`).join("\n"), 1_000),
						},
					]
				: []),
		],
	});
}

/** The category picker. */
export function categoryMenu(client: TestifyClient, surface: Surface, chosen: Category | null, ownerId: string) {
	const options = [
		new StringSelectMenuOptionBuilder()
			.setLabel("Help centre")
			.setDescription("Back to the front page.")
			.setValue(HELP_HOME)
			.setEmoji("📚")
			.setDefault(chosen === null),
		...populatedCategories(client).map((category) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(categoryLabel(category))
				.setDescription(`${commandsInCategory(client, category).length} commands`)
				.setValue(category)
				.setEmoji(categoryEmoji(category))
				.setDefault(category === chosen),
		),
	];

	return selectRow(
		select({ id: customId("help", "pick", surface, ownerId), placeholder: "📚 Choose a category", options }),
	);
}

/** Page arrows plus the slash/prefix toggle. */
export function categoryControls(
	category: Category,
	page: number,
	totalPages: number,
	surface: Surface,
	ownerId: string,
) {
	const other: Surface = surface === "slash" ? "prefix" : "slash";

	return row(
		button({
			id: customId("help", "page", surface, category, Math.max(0, page - 1), ownerId),
			emoji: theme.emoji.previous,
			disabled: page <= 0,
		}),
		button({
			id: customId("help", "noop", surface, category, page, ownerId),
			label: `${page + 1} / ${totalPages}`,
			disabled: true,
		}),
		button({
			id: customId("help", "page", surface, category, Math.min(totalPages - 1, page + 1), ownerId),
			emoji: theme.emoji.next,
			disabled: page >= totalPages - 1,
		}),
		button({
			id: customId("help", "swap", other, category, page, ownerId),
			label: other === "slash" ? "Show slash" : "Show prefix",
			style: ButtonStyle.Primary,
		}),
	);
}

/** Links, shown under the front page. */
export function helpLinks() {
	return row(linkButton("Support server", theme.supportServer), linkButton("Source code", theme.repository));
}

export function resolveCategory(value: string): Category | null {
	return isCategory(value) ? value : null;
}

export function resolveSurface(value: string | undefined): Surface {
	return value === "prefix" ? "prefix" : "slash";
}
