import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEverything } from "@core/loader";
import { commandEntries, fillPlaceholders, linkEntries, loadArticles } from "@lib/support/supportArticles.util";
import { supportScreen } from "@lib/support/supportScreen.util";
import { SUPPORT_TOPICS } from "@testify/shared";
import { textOf } from "@tests/helpers/containers";
import { createMockClient } from "@tests/helpers/mocks";

/** The help articles are checked against the bot they describe, so one that names a command that is gone fails here. */

const client = createMockClient();
loadEverything(client);

const results = loadArticles();
const articles = results.flatMap((result) => (result.ok ? [result.article] : []));
const { entries, problems } = linkEntries(articles, commandEntries(client.commands.values()));
const context = { bot: "Testify", prefix: "t?", repository: "https://github.com/Kkkermit/Testify" };

const routes = [
	...readFileSync(resolve(__dirname, "../../../dashboard/src/routes.tsx"), "utf8").matchAll(/path: "([^"]+)"/g),
].flatMap((match) => (match[1] === undefined || match[1].includes(":") || match[1] === "*" ? [] : [match[1]]));

const bodies = articles.map((article) => [article.entry.id, article.entry.body] as const);

/** Discord allows 4,000 characters of text across a Components V2 message. */
const DISCORD_TEXT_MAX = 4_000;

describe("the help articles", () => {
	it("all parse", () => {
		expect(results.filter((result) => !result.ok)).toEqual([]);
	});

	it("link only to commands and articles that exist", () => {
		expect(problems).toEqual([]);
	});

	it("cover every topic but the generated command pages", () => {
		const topics = new Set(articles.map((article) => article.entry.topic));

		expect(SUPPORT_TOPICS.filter((topic) => topic !== "commands" && !topics.has(topic))).toEqual([]);
	});

	it.each(bodies)("%s names only commands and subcommands that exist", (_id, body) => {
		const wrong: string[] = [];

		for (const [, name = "", sub] of body.matchAll(/`\/([a-z0-9-]+)(?: ([a-z0-9-]+))?/g)) {
			const command = client.commands.get(name);
			if (command === undefined) wrong.push(`/${name}`);
			else if (
				sub !== undefined &&
				command.subcommands !== undefined &&
				!command.subcommands.some((s) => s.name === sub)
			) {
				wrong.push(`/${name} ${sub}`);
			}
		}

		for (const [, name = ""] of body.matchAll(/`\{prefix\}([a-z0-9-]+)/g)) {
			if (!client.commands.has(name) && !client.aliases.has(name)) wrong.push(`{prefix}${name}`);
		}

		expect(wrong).toEqual([]);
	});

	it.each(bodies)("%s links only to dashboard pages that exist", (_id, body) => {
		const paths = [...body.matchAll(/\]\((\/[^)]*)\)/g)].map((match) => (match[1] ?? "").split("?")[0] ?? "");

		expect(paths.filter((path) => !routes.includes(path))).toEqual([]);
	});

	it("has the dashboard's routes to check against, so a broken pattern cannot pass vacuously", () => {
		expect(routes).toEqual(expect.arrayContaining(["/guilds", "/commands", "/status", "/help"]));
	});
});

describe("every answer, as Discord would receive it", () => {
	const related = [0, 1, 2, 3].map((index) => ({
		id: `related-${String(index)}`,
		title: "A related article with a long title to leave room for".padEnd(80, "."),
		topic: "setup" as const,
	}));

	it.each(entries.map((entry) => [entry.id, entry] as const))(
		"%s fits in one message, placeholders filled",
		(_id, entry) => {
			const answer = {
				id: entry.id,
				title: fillPlaceholders(entry.title, context),
				topic: entry.topic,
				body: fillPlaceholders(entry.body, context),
			};
			const screen = supportScreen(
				{ answer, related },
				{
					bot: "Testify",
					ownerId: "100000000000000001",
					dashboard: "https://dash.example.com",
					supportServer: "https://discord.gg/example",
				},
			);

			expect(textOf(screen).length).toBeLessThanOrEqual(DISCORD_TEXT_MAX);
			expect(answer.body).not.toMatch(/\{(?:fact:[^}]*|bot|prefix|repository)\}/);
		},
	);
});
