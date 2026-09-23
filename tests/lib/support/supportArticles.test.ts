import { PermissionFlagsBits } from "discord.js";
import { type Command } from "@core/command";
import { commandEntries, fillPlaceholders, loadArticles, parseArticle } from "@lib/support/supportArticles.util";

const ARTICLE =
	"---\nid: add-the-bot\ntitle: Adding {bot}\nkeywords: add, invite\nfeatured: true\n---\nPress **Add**.\n";

describe("parseArticle", () => {
	it("reads the frontmatter and the body", () => {
		expect(parseArticle("add-the-bot.md", ARTICLE)).toEqual({
			ok: true,
			entry: {
				id: "add-the-bot",
				title: "Adding {bot}",
				keywords: ["add", "invite"],
				body: "Press **Add**.",
				featured: true,
				kind: "article",
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
		["an unknown field", "add-the-bot.md", ARTICLE.replace("featured: true", "secret: yes")],
		["markup in the title", "add-the-bot.md", ARTICLE.replace("Adding {bot}", "<b>Adding</b>")],
		["an empty body", "add-the-bot.md", ARTICLE.replace("Press **Add**.\n", "")],
		["a body past the limit", "add-the-bot.md", ARTICLE.replace("Press **Add**.", "a".repeat(2_001))],
	])("refuses %s", (_label, file, source) => {
		expect(parseArticle(file, source).ok).toBe(false);
	});
});

describe("loadArticles", () => {
	/** A broken article is skipped with a warning at start-up, so this is where its author learns of it. */
	it("parses every article in assets/support", () => {
		const failures = loadArticles().filter((result) => !result.ok);

		expect(failures).toEqual([]);
	});
});

function command(overrides: Partial<Command>): Command {
	return { name: "ban", description: "Bans a user from the server.", category: "moderation", ...overrides };
}

describe("commandEntries", () => {
	it("writes a page with both ways to run it, its subcommands, aliases and the permission it needs", () => {
		const [entry] = commandEntries([
			command({
				name: "warn",
				description: "Issues and manages warnings.",
				aliases: ["w"],
				permissions: [PermissionFlagsBits.ModerateMembers],
				subcommands: [{ name: "create", description: "Warns a member.", aliases: ["strike"], run: jest.fn() }],
			}),
		]);

		expect(entry).toMatchObject({ id: "command-warn", title: "The /warn command", kind: "command" });
		expect(entry?.body).toContain("`/warn` or `{prefix}warn`");
		expect(entry?.body).toContain("- `/warn create`: Warns a member.");
		expect(entry?.body).toContain("`{prefix}w`, `{prefix}strike`");
		expect(entry?.body).toContain("Needs **moderate members**.");
		expect(entry?.keywords).toEqual(expect.arrayContaining(["warn", "moderation", "w", "strike", "create"]));
	});

	it("leaves out owner commands, by flag and by category", () => {
		const entries = commandEntries([
			command({ name: "eval", ownerOnly: true }),
			command({ name: "guild-list", category: "owner" }),
			command({ name: "suggest", category: "developer" }),
		]);

		expect(entries.map((entry) => entry.id)).toEqual(["command-suggest"]);
	});
});

describe("fillPlaceholders", () => {
	const context = { bot: "Testify", prefix: "t?", repository: "https://github.com/Kkkermit/Testify" };

	it("fills every placeholder, as often as it appears", () => {
		expect(fillPlaceholders("{bot} uses {prefix}help; ask {bot}. {repository}", context)).toBe(
			"Testify uses t?help; ask Testify. https://github.com/Kkkermit/Testify",
		);
	});

	/** `String.replace` reads `$&` in a replacement string as "the match", which a server's prefix may well contain. */
	it("writes a prefix with a dollar sign in it literally", () => {
		expect(fillPlaceholders("{prefix}help", { ...context, prefix: "$&" })).toBe("$&help");
	});
});
