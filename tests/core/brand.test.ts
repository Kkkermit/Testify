import { botName, nameBot } from "@core/brand";

describe("botName", () => {
	afterEach(() => {
		nameBot(() => undefined);
	});

	/** Read live, so renaming the bot from the owner console changes it without a restart. */
	it("follows the Discord username, and uses the built-in name only before login", () => {
		const discord: { username?: string } = {};
		nameBot(() => discord.username);

		expect(botName()).toBe("Testify");
		discord.username = "helper-app";
		expect(botName()).toBe("helper-app");
	});
});
