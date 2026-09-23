import { PermissionFlagsBits } from "discord.js";
import { type Command } from "@core/command";
import {
	type Article,
	commandEntries,
	commandReference,
	fillPlaceholders,
	linkEntries,
	loadArticles,
	parseArticle,
} from "@lib/support/supportArticles.util";
import { FACTS } from "@lib/support/supportFacts.util";

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
	it("reads the frontmatter and the body", () => {
		expect(parseArticle("add-the-bot.md", ARTICLE)).toEqual({
			ok: true,
			article: {
				entry: {
					id: "add-the-bot",
					title: "Adding {bot}",
					topic: "getting-started",
					keywords: ["add", "invite"],
					questions: ["How do I add it?", "How do I invite it?"],
					body: "Press **Add**. Daily pays {fact:economy.dailyBase}.",
					featured: true,
					kind: "article",
					links: [],
				},
				commands: ["help"],
				related: ["sign-in"],
			},
		});
	});

	it("reads Windows line endings the same way", () => {
		expect(parseArticle("add-the-bot.md", ARTICLE.replace(/\n/g, "\r\n")).ok).toBe(true);
	});

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
	it("writes the usage, every option, and what the command needs", () => {
		const page = commandReference(
			command({
				options: [
					{ name: "user", description: "The user to ban.", type: "user", required: true },
					{
						name: "mode",
						description: "How.",
						type: "string",
						choices: [
							{ name: "soft", value: "soft" },
							{ name: "hard", value: "hard" },
						],
					},
				],
				aliases: ["b"],
				permissions: [PermissionFlagsBits.BanMembers],
				botPermissions: [PermissionFlagsBits.BanMembers],
				guildOnly: true,
				cooldown: 5_000,
			}),
		);

		expect(page).toContain("`/ban <user> [mode]`");
		expect(page).toContain("- **user** (required): The user to ban.");
		expect(page).toContain("One of `soft` and `hard`.");
		expect(page).toContain("`{prefix}ban`, or `{prefix}b`");
		expect(page).toContain("You need **ban members**.");
		expect(page).toContain("The bot needs **ban members**.");
		expect(page).toContain("Only works in a server");
		expect(page).toContain("Wait 5 seconds between uses.");
	});

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

describe("commandEntries", () => {
	it("leaves out owner commands, by flag and by category, and keeps the feedback ones", () => {
		const entries = commandEntries([
			command({ name: "eval", ownerOnly: true }),
			command({ name: "guild-list", category: "owner" }),
			command({ name: "suggest", category: "developer" }),
		]);

		expect(entries.map((entry) => entry.id)).toEqual(["command-suggest"]);
		expect(entries[0]).toMatchObject({ topic: "commands", kind: "command" });
	});
});

describe("linkEntries", () => {
	function article(id: string, commands: string[], related: string[] = []): Article {
		const result = parseArticle(`${id}.md`, ARTICLE.replaceAll("add-the-bot", id));
		if (!result.ok) throw new Error(result.reason);
		return { ...result.article, commands, related };
	}

	it("joins a guide to its command pages, and each command page back to its guides", () => {
		const { entries, problems } = linkEntries(
			[article("guide", ["ban"], ["other"]), article("other", [])],
			commandEntries([command({})]),
		);

		expect(problems).toEqual([]);
		expect(entries.find((entry) => entry.id === "guide")?.links).toEqual(["other", "command-ban"]);
		expect(entries.find((entry) => entry.id === "command-ban")?.links).toEqual(["guide"]);
	});

	it("names a link that points at nothing, and leaves it out", () => {
		const { entries, problems } = linkEntries([article("guide", ["gone"], ["missing"])], []);

		expect(problems).toEqual([
			{ article: "guide", missing: "command-gone" },
			{ article: "guide", missing: "missing" },
		]);
		expect(entries[0]?.links).toEqual([]);
	});
});

describe("fillPlaceholders", () => {
	const context = { bot: "Testify", prefix: "t?", repository: "https://github.com/Kkkermit/Testify" };

	it("fills every placeholder, as often as it appears, and every fact from the code", () => {
		expect(fillPlaceholders("{bot} uses {prefix}help; ask {bot}. {repository} {fact:economy.dailyBase}", context)).toBe(
			`Testify uses t?help; ask Testify. https://github.com/Kkkermit/Testify ${FACTS["economy.dailyBase"] ?? ""}`,
		);
	});

	/** `String.replace` reads `$&` in a replacement string as "the match", which a server's prefix may well contain. */
	it("writes a prefix with a dollar sign in it literally", () => {
		expect(fillPlaceholders("{prefix}help", { ...context, prefix: "$&" })).toBe("$&help");
	});
});
