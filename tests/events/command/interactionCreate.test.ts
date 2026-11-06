import { Collection, DiscordAPIError, type Interaction } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { type ContextMenu } from "@core/contextMenu";
import interactionCreate from "@events/command/interactionCreate.event";

const checkContextMenu = jest.fn<Promise<string | null>, []>(() => Promise.resolve(null));

jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkContextMenu: () => checkContextMenu(),
}));

/** How the autocomplete branch reports a failure, which is the one place a routine refusal looked like a bug. */

const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };

function clientWith(autocomplete: () => Promise<void>): TestifyClient {
	const commands = new Collection<string, Command>();
	commands.set("play", { name: "play", description: "Plays.", category: "music", autocomplete });

	return { commands, logger } as unknown as TestifyClient;
}

function typing(): Interaction {
	return {
		isAutocomplete: () => true,
		commandName: "play",
		createdTimestamp: Date.now() - 2_500,
	} as unknown as Interaction;
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
	expect(logger.trace).toHaveBeenCalledTimes(1);
	// Every keystroke typed over an answer produces one, so a development bot at debug must stay quiet about it.
	expect(logger.debug).not.toHaveBeenCalled();
});

/** One per keystroke, and a stack each ran to forty lines that pointed at nothing wrong. */
it("notes an expired interaction in one line, with its age rather than its stack", async () => {
	const expired = new DiscordAPIError({ message: "Unknown interaction", code: 10062 }, 10062, 404, "POST", "u", {});

	await interactionCreate.run(
		clientWith(() => Promise.reject(expired)),
		typing(),
	);

	const [context] = logger.trace.mock.calls[0] as [Record<string, unknown>];
	expect(context).not.toHaveProperty("err");
	expect(context).toEqual({ command: "play", ageMs: expect.any(Number) });
	expect(context.ageMs).toBeGreaterThanOrEqual(2_500);
});

it("still reports anything else as a failure, with its stack", async () => {
	await interactionCreate.run(
		clientWith(() => Promise.reject(new TypeError("broken"))),
		typing(),
	);

	expect(logger.error).toHaveBeenCalledWith(
		expect.objectContaining({ err: expect.any(TypeError) }),
		"[AUTOCOMPLETE_ERROR] An autocomplete failed.",
	);
});

it("says nothing at all when the autocomplete answers", async () => {
	await interactionCreate.run(
		clientWith(() => Promise.resolve()),
		typing(),
	);

	expect(logger.error).not.toHaveBeenCalled();
	expect(logger.debug).not.toHaveBeenCalled();
	expect(logger.trace).not.toHaveBeenCalled();
});

describe("a right-click action", () => {
	const run = jest.fn(() => Promise.resolve());
	const menu: ContextMenu = { name: "Warn", description: "Warns.", type: "user", switchedBy: "warn", run };

	function rightClick() {
		return {
			isAutocomplete: () => false,
			isChatInputCommand: () => false,
			isContextMenuCommand: () => true,
			isUserContextMenuCommand: () => true,
			isMessageContextMenuCommand: () => false,
			inCachedGuild: () => true,
			commandName: "Warn",
			guildId: "400000000000000004",
			user: { id: "200000000000000002" },
			reply: jest.fn(() => Promise.resolve()),
		};
	}

	const client = () =>
		({
			commands: new Collection(),
			contextMenus: new Collection([["Warn", menu]]),
			logger,
		}) as unknown as TestifyClient;

	it("runs once its gates pass", async () => {
		const interaction = rightClick();

		await interactionCreate.run(client(), interaction as unknown as Interaction);

		expect(run).toHaveBeenCalledWith(interaction, expect.anything());
	});

	/** The refusal goes to the person who clicked, and the action never starts. */
	it("refuses privately when a gate says no", async () => {
		checkContextMenu.mockResolvedValueOnce("You need these permissions: `Moderate Members`");
		const interaction = rightClick();

		await interactionCreate.run(client(), interaction as unknown as Interaction);

		expect(run).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: 64 }));
	});
});
