import giveaway from "@commands/giveaway/giveaway.command";
import { UserFacingError } from "@core/errors";
import { endGiveaway, listGiveaways } from "@lib/giveaways";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@lib/giveaways", () => ({
	...jest.requireActual<object>("@lib/giveaways"),
	listGiveaways: jest.fn(),
	endGiveaway: jest.fn(() => Promise.resolve()),
}));

const row = (messageId: string, prize: string, ended: boolean) => ({
	messageId,
	channelId: "500000000000000005",
	prize,
	winnerCount: 1,
	startAt: new Date().toISOString(),
	endAt: new Date().toISOString(),
	ended,
	winners: [],
	hostedBy: null,
});

beforeEach(() => {
	jest
		.mocked(listGiveaways)
		.mockResolvedValue([row("800000000000000001", "Nitro", false), row("800000000000000002", "Mug", true)]);
});

/** `discord-giveaways` looks a message up across every server, so a manager could end another server's giveaway by ID. */
it("refuses a giveaway that is not in this server", async () => {
	const end = giveaway.subcommands?.find((subcommand) => subcommand.name === "end");
	const interaction = createMockInteraction({ subcommand: "end", options: { "message-id": "999999999999999999" } });

	await expect(end?.run(interaction, createMockClient())).rejects.toBeInstanceOf(UserFacingError);
	expect(endGiveaway).not.toHaveBeenCalled();
});

it("offers this server's giveaways by prize, only the running ones to end", async () => {
	const respond = jest.fn();
	const interaction = {
		guildId: "400000000000000004",
		options: { getSubcommand: () => "end", getFocused: () => "" },
		respond,
	};

	await giveaway.autocomplete?.(interaction as never, createMockClient());

	expect(respond).toHaveBeenCalledWith([{ name: "Nitro · running", value: "800000000000000001" }]);
});
