import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineCommand } from "@core/command";
import {
	categoryPage,
	commandPage,
	HELP_PAGE_SIZE,
	helpHome,
	pagesOf,
	populatedCategories,
	resolveCategory,
	resolveSurface,
	visibleCommands,
} from "@lib/helpPages.util";
import { createMockClient } from "@tests/helpers/mocks";

function clientWith(count: number, category: "fun" | "owner" = "fun"): TestifyClient {
	const commands = new Collection<string, ReturnType<typeof defineCommand>>();

	for (let index = 0; index < count; index += 1) {
		commands.set(
			`cmd${index}`,
			defineCommand({ name: `cmd${index}`, description: `Command ${index}.`, category, run: jest.fn() }),
		);
	}

	return createMockClient({ commands });
}

describe("which commands help shows", () => {
	it("hides the owner category", () => {
		expect(visibleCommands(clientWith(3, "owner"))).toEqual([]);
		expect(populatedCategories(clientWith(3, "owner"))).toEqual([]);
	});

	it("lists a category that has commands in it", () => {
		expect(populatedCategories(clientWith(2))).toEqual(["fun"]);
	});
});

describe("paging", () => {
	it("fills a page before starting another", () => {
		expect(pagesOf(clientWith(HELP_PAGE_SIZE), "fun")).toHaveLength(1);
		expect(pagesOf(clientWith(HELP_PAGE_SIZE + 1), "fun")).toHaveLength(2);
	});

	it("always returns at least one page, even for an empty category", () => {
		expect(pagesOf(clientWith(0), "fun")).toEqual([[]]);
	});

	it("clamps a page number past the end rather than rendering nothing", () => {
		const client = clientWith(2);
		const beyond = categoryPage(client, "fun", 99, "slash", "t?");

		expect(beyond.data.fields?.length).toBe(2);
	});
});

describe("what the pages say", () => {
	it("shows the prefix on the front page", () => {
		expect(JSON.stringify(helpHome(clientWith(3), "slash", "!"))).toContain("!");
	});

	it("writes commands as slash or as prefix depending on the surface", () => {
		const client = clientWith(1);

		expect(JSON.stringify(categoryPage(client, "fun", 0, "slash", "t?"))).toContain("/cmd0");
		expect(JSON.stringify(categoryPage(client, "fun", 0, "prefix", "t?"))).toContain("t?cmd0");
	});

	it("shows a command's own page with both forms", () => {
		const command = defineCommand({ name: "ban", description: "Bans.", category: "moderation", run: jest.fn() });
		const page = JSON.stringify(commandPage(command, "slash", "t?"));

		expect(page).toContain("/ban");
		expect(page).toContain("t?ban");
	});
});

describe("resolving what the user asked for", () => {
	it("accepts a real category and rejects anything else", () => {
		expect(resolveCategory("fun")).toBe("fun");
		expect(resolveCategory("nonsense")).toBeNull();
	});

	it("defaults to the slash surface", () => {
		expect(resolveSurface("prefix")).toBe("prefix");
		expect(resolveSurface("slash")).toBe("slash");
		expect(resolveSurface(undefined)).toBe("slash");
	});
});

describe("richer command pages", () => {
	const full = defineCommand({
		name: "ban",
		description: "Bans a member.",
		category: "moderation",
		aliases: ["hammer"],
		cooldown: 5_000,
		options: [
			{ name: "user", description: "Who to ban.", type: "user", required: true },
			{ name: "reason", description: "Why.", type: "string" },
		],
		run: () => Promise.resolve(),
	});

	const withSubs = defineCommand({
		name: "music",
		description: "Music controls.",
		category: "music",
		subcommands: Array.from({ length: 14 }, (_unused, index) => ({
			name: `sub${index}`,
			description: `Does thing ${index}.`,
			aliases: [`s${index}`],
			run: () => Promise.resolve(),
		})),
	});

	it("lists cooldown, aliases and options when a command has them", () => {
		const rendered = JSON.stringify(commandPage(full, "slash", "t?").toJSON());

		expect(rendered).toContain("Cooldown");
		expect(rendered).toContain("5s");
		expect(rendered).toContain("hammer");
		expect(rendered).toContain("(required)");
	});

	it("leaves those fields out when a command has none of them", () => {
		const plain = defineCommand({
			name: "ping",
			description: "Pong.",
			category: "info",
			run: () => Promise.resolve(),
		});
		const names = commandPage(plain, "slash", "t?")
			.toJSON()
			.fields?.map((field) => field.name);

		expect(names).not.toEqual(expect.arrayContaining(["Cooldown", "Aliases", "Options"]));
	});

	it("shows both ways of running a command", () => {
		const usage = commandPage(full, "slash", "t?")
			.toJSON()
			.fields?.find((field) => field.name === "Usage");

		expect(usage?.value).toContain("/ban");
		expect(usage?.value).toContain("t?ban");
	});

	/** Discord caps a field at 1024 characters, so a long subcommand list has to stop. */
	it("caps a long subcommand list and says how many were hidden", () => {
		const client = createMockClient({
			commands: new Collection([["music", withSubs]]),
		});

		const rendered = JSON.stringify(categoryPage(client, "music", 0, "slash", "t?").toJSON());

		expect(rendered).toContain("and 4 more");
	});

	it("lists prefix aliases only on the prefix surface", () => {
		const client = createMockClient({
			commands: new Collection([["ban", full]]),
		});

		expect(JSON.stringify(categoryPage(client, "moderation", 0, "prefix", "t?").toJSON())).toContain("**Also**");
		expect(JSON.stringify(categoryPage(client, "moderation", 0, "slash", "t?").toJSON())).not.toContain("**Also**");
	});

	it("clamps a page number past the end back onto the last page", () => {
		const client = createMockClient({
			commands: new Collection([["ban", full]]),
		});

		expect(() => categoryPage(client, "moderation", 99, "slash", "t?")).not.toThrow();
	});
});
