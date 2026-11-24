import giveaway from "@commands/giveaway/giveaway.command";
import { UserFacingError } from "@core/errors";
import { endGiveaway, findGiveaway, listGiveaways, rerollGiveaway } from "@lib/giveaways";
import { createMockClient, createMockInteraction } from "@tests/helpers/mocks";

jest.mock("@lib/giveaways", () => ({
	...jest.requireActual<object>("@lib/giveaways"),
	listGiveaways: jest.fn(),
	findGiveaway: jest.fn(() => Promise.resolve(null)),
	endGiveaway: jest.fn(() => Promise.resolve()),
	rerollGiveaway: jest.fn(() => Promise.resolve()),
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

/** The list stops at a server's fifty newest giveaways, so looking one up there refused to end or reroll an older one. */
it("finds a giveaway by its message, however many newer ones the server has run", async () => {
	jest
		.mocked(listGiveaways)
		.mockResolvedValue(
			Array.from({ length: 50 }, (_, index) => row(`8000000000000001${String(index).padStart(2, "0")}`, "New", true)),
		);
	jest.mocked(findGiveaway).mockResolvedValue(row("800000000000000999", "Old mug", true));
	const reroll = giveaway.subcommands?.find((subcommand) => subcommand.name === "reroll");
	const interaction = createMockInteraction({ subcommand: "reroll", options: { "message-id": "800000000000000999" } });

	await reroll?.run(interaction, createMockClient());

	expect(rerollGiveaway).toHaveBeenCalledWith(expect.anything(), interaction.guild?.id, "800000000000000999");
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
