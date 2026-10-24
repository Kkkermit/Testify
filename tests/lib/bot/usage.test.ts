import { type Command } from "@core/command";
import { recordCommandRun } from "@database/repositories/commandRunRepository";
import { recordCommandUse } from "@database/repositories/usageRepository";
import { countCommandUse } from "@lib/bot/usage.util";
import { CHANNEL_ID, createMockClient, createMockInteraction, GUILD_ID, USER_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/usageRepository", () => ({ recordCommandUse: jest.fn(() => Promise.resolve()) }));
jest.mock("@database/repositories/commandRunRepository", () => ({
	recordCommandRun: jest.fn(() => Promise.resolve()),
}));

const music: Command = {
	name: "music",
	description: "d",
	category: "music",
	subcommands: [{ name: "play", description: "d", run: () => Promise.resolve() }],
};

const run = { surface: "slash", ok: true, durationMs: 42, channelId: CHANNEL_ID } as const;

beforeEach(() => {
	jest.clearAllMocks();
});

it("counts the run and notes who ran it, with the subcommand", () => {
	const client = createMockClient();

	countCommandUse(client, createMockInteraction({ subcommand: "play" }), music, run);

	expect(recordCommandUse).toHaveBeenCalledWith({
		command: "music",
		guildId: GUILD_ID,
		surface: "slash",
		failed: false,
	});
	expect(recordCommandRun).toHaveBeenCalledWith({
		guildId: GUILD_ID,
		channelId: CHANNEL_ID,
		userId: USER_ID,
		username: "alice",
		command: "music",
		subcommand: "play",
		surface: "slash",
		failed: false,
		reference: null,
		durationMs: 42,
	});
});

/** The drill-down is per server, so a direct message would be a record of somebody with no server to show it in. */
it("never notes who ran a command in a direct message", () => {
	countCommandUse(createMockClient(), createMockInteraction({ inGuild: false }), music, run);

	expect(recordCommandUse).toHaveBeenCalledTimes(1);
	expect(recordCommandRun).not.toHaveBeenCalled();
});

it("keeps the reference an unexpected failure was logged under", () => {
	countCommandUse(createMockClient(), createMockInteraction(), music, { ...run, ok: false, reference: "AB12CD" });

	expect(recordCommandRun).toHaveBeenCalledWith(expect.objectContaining({ failed: true, reference: "AB12CD" }));
});

it("marks a failed run as failed in both records", () => {
	countCommandUse(createMockClient(), createMockInteraction(), music, { ...run, ok: false });

	expect(recordCommandUse).toHaveBeenCalledWith(expect.objectContaining({ failed: true }));
	expect(recordCommandRun).toHaveBeenCalledWith(expect.objectContaining({ failed: true }));
});

it("notes a failed write at debug and leaves the command alone", async () => {
	jest.mocked(recordCommandRun).mockRejectedValueOnce(new Error("down"));
	const logger = { debug: jest.fn(), error: jest.fn() };
	const client = createMockClient({ logger } as never);

	countCommandUse(client, createMockInteraction(), music, run);
	await new Promise((resolve) => setImmediate(resolve));

	expect(logger.debug).toHaveBeenCalledTimes(1);
	expect(logger.error).not.toHaveBeenCalled();
});
