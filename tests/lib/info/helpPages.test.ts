import { Collection } from "discord.js";
import { parseCustomId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { defineCommand } from "@core/command";
import { categoryControls, categoryPage, commandPage, helpHome, resolveCategory } from "@lib/info/helpPages.util";
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

describe("the page controls", () => {
	const OWNER = "100000000000000001";
	const idsOf = (controls: ReturnType<typeof categoryControls>) =>
		controls.toJSON().components.map((part) => (part as { custom_id: string }).custom_id);

	/** On a one-page category Previous and Next both point at page 0, and Discord refused the whole reply. */
	it("never gives two buttons the same id, however many pages there are", () => {
		for (const total of [1, 2, 5]) {
			for (let page = 0; page < total; page += 1) {
				const ids = idsOf(categoryControls("fun", page, total, "slash", OWNER));
				expect(new Set(ids).size).toBe(ids.length);
			}
		}
	});

	it("still reads the page to go to, and keeps the owner last", () => {
		const [previous, , next] = idsOf(categoryControls("fun", 1, 3, "slash", OWNER)).map(parseCustomId);

		expect(previous).toMatchObject({ action: "page", args: ["slash", "fun", "0", "prev", OWNER] });
		expect(next).toMatchObject({ action: "page", args: ["slash", "fun", "2", "next", OWNER] });
	});
});

describe("what the pages say", () => {
	it("shows the prefix on the front page", () => {
		expect(JSON.stringify(helpHome(clientWith(3), "slash", "!"))).toContain("!");
	});
});

describe("resolving what the user asked for", () => {
	it("accepts a real category and rejects anything else", () => {
		expect(resolveCategory("fun")).toBe("fun");
		expect(resolveCategory("nonsense")).toBeNull();
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
		name: "settings",
		description: "Server settings.",
		category: "settings",
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

	/** Discord caps a field at 1024 characters, so a long subcommand list has to stop. */
	it("caps a long subcommand list and says how many were hidden", () => {
		const client = createMockClient({
			commands: new Collection([["settings", withSubs]]),
		});

		const rendered = JSON.stringify(categoryPage(client, "settings", 0, "slash", "t?").toJSON());

		expect(rendered).toContain("and 4 more");
	});

	it("lists prefix aliases only on the prefix surface", () => {
		const client = createMockClient({
			commands: new Collection([["ban", full]]),
		});

		expect(JSON.stringify(categoryPage(client, "moderation", 0, "prefix", "t?").toJSON())).toContain("**Also**");
		expect(JSON.stringify(categoryPage(client, "moderation", 0, "slash", "t?").toJSON())).not.toContain("**Also**");
	});
});
