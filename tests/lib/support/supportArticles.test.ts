import { PermissionFlagsBits } from "discord.js";
import { type Command } from "@core/command";
import { commandReference, fillPlaceholders, loadArticles, parseArticle } from "@lib/support/supportArticles.util";

const ARTICLE = [
	"---",
	"id: add-the-bot",
	"title: Adding {bot}",
	"topic: getting-started",
	"keywords: add, invite",
	"questions: How do I add it? | How do I invite it?",
	"commands: help",
	"related: sign-in",
	"featured: true",
	"---",
	"Press **Add**. Daily pays {fact:economy.dailyBase}.",
	"",
].join("\n");

describe("parseArticle", () => {
	it.each([
		["no frontmatter", "add-the-bot.md", "Just a body."],
		["an id that is not the file name", "other.md", ARTICLE],
		["an id that is not a slug", "Bad Id.md", ARTICLE.replace("id: add-the-bot", "id: Bad Id")],
		["a topic that does not exist", "add-the-bot.md", ARTICLE.replace("topic: getting-started", "topic: gossip")],
		["an unknown field", "add-the-bot.md", ARTICLE.replace("featured: true", "secret: yes")],
		["markup in the title", "add-the-bot.md", ARTICLE.replace("Adding {bot}", "<b>Adding</b>")],
		["an empty body", "add-the-bot.md", ARTICLE.replace(/---\nPress[\s\S]*$/, "---\n")],
		["a body past the limit", "add-the-bot.md", ARTICLE.replace("Press **Add**.", "a".repeat(3_001))],
		["a fact the code does not have", "add-the-bot.md", ARTICLE.replace("economy.dailyBase", "economy.madeUp")],
	])("refuses %s", (_label, file, source) => {
		expect(parseArticle(file, source).ok).toBe(false);
	});
});

describe("loadArticles", () => {
	/** A broken article is skipped with a warning at start-up, so this is where its author learns of it. */
	it("parses every article in assets/support", () => {
		expect(loadArticles().filter((result) => !result.ok)).toEqual([]);
	});
});

function command(overrides: Partial<Command>): Command {
	return { name: "ban", description: "Bans a user from the server.", category: "moderation", ...overrides };
}

describe("commandReference", () => {
	it("lists each subcommand with its own usage, and the permission only it needs", () => {
		const page = commandReference(
			command({
				name: "lottery",
				subcommands: [
					{ name: "enter", description: "Buy tickets.", options: [], run: jest.fn() },
					{ name: "delete", description: "Remove it.", permissions: [PermissionFlagsBits.ManageGuild], run: jest.fn() },
				],
			}),
		);

		expect(page).toContain("- `/lottery enter`: Buy tickets.");
		expect(page).toContain("- `/lottery delete`: Remove it. Needs **manage guild**.");
	});
});

describe("fillPlaceholders", () => {
	const context = { bot: "Testify", prefix: "t?", repository: "https://github.com/Kkkermit/Testify" };

	/** `String.replace` reads `$&` in a replacement string as "the match", which a server's prefix may well contain. */
	it("writes a prefix with a dollar sign in it literally", () => {
		expect(fillPlaceholders("{prefix}help", { ...context, prefix: "$&" })).toBe("$&help");
	});
});
