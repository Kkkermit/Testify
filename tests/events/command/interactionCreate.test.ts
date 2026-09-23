import { Collection, DiscordAPIError, type Interaction } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import interactionCreate from "@events/command/interactionCreate.event";

/** How the autocomplete branch reports a failure, which is the one place a routine refusal looked like a bug. */

const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };

function clientWith(autocomplete: () => Promise<void>): TestifyClient {
	const commands = new Collection<string, Command>();
	commands.set("play", { name: "play", description: "Plays.", category: "music", autocomplete });

	return { commands, logger } as unknown as TestifyClient;
}

function typing(): Interaction {
	return { isAutocomplete: () => true, commandName: "play" } as unknown as Interaction;
}

beforeEach(() => {
	jest.clearAllMocks();
});

/** 10062 is an interaction Discord already closed, which is somebody typing fast rather than a failure. */
it("notes an expired autocomplete interaction rather than reporting it as a failure", async () => {
	const expired = new DiscordAPIError({ message: "Unknown interaction", code: 10062 }, 10062, 404, "POST", "u", {});

	await interactionCreate.run(
		clientWith(() => Promise.reject(expired)),
		typing(),
	);

	expect(logger.error).not.toHaveBeenCalled();
	expect(logger.debug).toHaveBeenCalledTimes(1);
});

it("still reports anything else as a failure, with its stack", async () => {
	await interactionCreate.run(
		clientWith(() => Promise.reject(new TypeError("broken"))),
		typing(),
	);

	expect(logger.error).toHaveBeenCalledWith(
		expect.objectContaining({ err: expect.any(TypeError) }),
		"Autocomplete failed",
	);
});

it("says nothing at all when the autocomplete answers", async () => {
	await interactionCreate.run(
		clientWith(() => Promise.resolve()),
		typing(),
	);

	expect(logger.error).not.toHaveBeenCalled();
	expect(logger.debug).not.toHaveBeenCalled();
});
