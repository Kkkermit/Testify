import { botName, nameBot } from "@core/brand";

describe("botName", () => {
	afterEach(() => {
		nameBot(undefined, () => undefined);
	});

	it("uses BOT_NAME from the environment over the Discord username", () => {
		nameBot("Helper", () => "helper-app");

		expect(botName()).toBe("Helper");
	});

	/** Read live, so renaming the bot from the owner console changes it without a restart. */
	it("follows the Discord username when BOT_NAME is blank", () => {
		const discord: { username?: string } = {};
		nameBot(undefined, () => discord.username);

		expect(botName()).toBe("Testify");
		discord.username = "helper-app";
		expect(botName()).toBe("helper-app");
	});
});
