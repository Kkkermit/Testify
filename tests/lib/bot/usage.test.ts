import { type Command } from "@core/command";
import { recordCommandRun } from "@database/repositories/commandRunRepository";
import { recordCommandUse } from "@database/repositories/usageRepository";
import { countCommandUse } from "@lib/bot/usage.util";
import { CHANNEL_ID, createMockClient, createMockInteraction } from "@tests/helpers/mocks";

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

/** The drill-down is per server, so a direct message would be a record of somebody with no server to show it in. */
it("never notes who ran a command in a direct message", () => {
	countCommandUse(createMockClient(), createMockInteraction({ inGuild: false }), music, run);

	expect(recordCommandUse).toHaveBeenCalledTimes(1);
	expect(recordCommandRun).not.toHaveBeenCalled();
});
