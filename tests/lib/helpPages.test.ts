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
