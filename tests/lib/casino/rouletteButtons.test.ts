import { Types } from "mongoose";
import roulette from "@buttons/roulette";
import { checkCasinoPlay } from "@core/checks";
import type * as Casino from "@lib/casino";

jest.mock("@lib/casino", () => ({
	...jest.requireActual<typeof Casino>("@lib/casino"),
	placeBets: jest.fn(),
	changeChip: jest.fn(() => Promise.resolve(500)),
	clearMyBets: jest.fn(),
	openRound: jest.fn(),
}));
jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkCasinoPlay: jest.fn(() => Promise.resolve(null)),
}));

const { placeBets, changeChip, clearMyBets, openRound } = jest.requireMock("@lib/casino");

const ROUND = "65f000000000000000000001";
const GUILD = "111111111111111111";
const PLAYER = "222222222222222222";

const round = {
	_id: new Types.ObjectId(ROUND),
	guildId: GUILD,
	channelId: "444444444444444444",
	messageId: "555555555555555555",
	hostId: PLAYER,
	chip: 100,
	status: "betting",
	closesAt: null,
	pocket: null,
	players: {},
	expiresAt: new Date(),
	createdAt: new Date(),
	updatedAt: new Date(),
};

function pressed(options: { modal?: Record<string, string> } = {}) {
	return {
		guildId: GUILD,
		channelId: "444444444444444444",
		message: { id: "555555555555555555" },
		user: { id: PLAYER, username: "alice", globalName: null },
		member: { displayName: "Alice" },
		isButton: () => options.modal === undefined,
		isModalSubmit: () => options.modal !== undefined,
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.modal?.[id] ?? "" },
		update: jest.fn(() => Promise.resolve()),
		reply: jest.fn(() => Promise.resolve()),
		followUp: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
	};
}

const client = {} as never;
const seat = { guildId: GUILD, userId: PLAYER, name: "Alice" };
const run = (interaction: ReturnType<typeof pressed>, action: string, args: string[]) =>
	roulette.run(interaction as never, { client, action, args });

beforeEach(() => {
	jest.clearAllMocks();
	placeBets.mockResolvedValue(round);
	openRound.mockResolvedValue(round);
});

describe("the roulette table's buttons", () => {
	/** Anybody in the channel may bet, so the handler must not be limited to the person who opened the table. */
	it("is open to everybody, not only whoever opened the table", () => {
		expect(roulette.ownerOnly).not.toBe(true);
	});

	it("puts a chip on the pressed spot, through the casino's gates, and redraws the table", async () => {
		const interaction = pressed();
		await run(interaction, "bet", [ROUND, "red"]);

		expect(checkCasinoPlay).toHaveBeenCalledWith(client, seat, "roulette");
		expect(placeBets).toHaveBeenCalledWith(client, seat, ROUND, [{ kind: "red" }]);
		expect(interaction.update).toHaveBeenCalled();
	});

	it("refuses a player the casino would refuse, before any chip goes down", async () => {
		jest.mocked(checkCasinoPlay).mockResolvedValueOnce("The casino is closed in this server.");

		await expect(run(pressed(), "bet", [ROUND, "odd"])).rejects.toThrow(/closed/);
		expect(placeBets).not.toHaveBeenCalled();
	});

	it("ignores a spot no button offers", async () => {
		await run(pressed(), "bet", [ROUND, "n99"]);
		expect(placeBets).not.toHaveBeenCalled();
	});

	it("puts a chip on each number typed into the form", async () => {
		await run(pressed({ modal: { numbers: "7, 17 32" } }), "numset", [ROUND]);

		expect(placeBets).toHaveBeenCalledWith(client, seat, ROUND, [
			{ kind: "number", number: 7 },
			{ kind: "number", number: 17 },
			{ kind: "number", number: 32 },
		]);
	});

	it("says what was wrong with the numbers, and bets nothing", async () => {
		await expect(run(pressed({ modal: { numbers: "40" } }), "numset", [ROUND])).rejects.toThrow(/0 to 36/);
		expect(placeBets).not.toHaveBeenCalled();
	});

	it("changes the player's chip from a size button and tells only them", async () => {
		const interaction = pressed();
		await run(interaction, "chipto", [ROUND, "500"]);

		expect(changeChip).toHaveBeenCalledWith(seat, ROUND, "500");
		expect(interaction.reply).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining("500") }),
		);
	});

	it("changes the chip from the form too", async () => {
		await run(pressed({ modal: { chip: "half" } }), "chipset", [ROUND]);

		expect(changeChip).toHaveBeenCalledWith(seat, ROUND, "half");
	});

	it("clears the player's own chips, redraws the table and tells them what came back", async () => {
		clearMyBets.mockResolvedValue({ round, refunded: 300 });
		const interaction = pressed();
		await run(interaction, "clear", [ROUND]);

		expect(clearMyBets).toHaveBeenCalledWith(seat, ROUND);
		expect(interaction.update).toHaveBeenCalled();
		expect(interaction.followUp).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining("300") }),
		);
	});

	/** A new round goes on the same message, so the channel keeps one table rather than a stack of them. */
	it("starts a new round on the same message from Play again", async () => {
		const interaction = pressed();
		await run(interaction, "again", ["250", "public"]);

		expect(openRound).toHaveBeenCalledWith(
			{ guildId: GUILD, channelId: "444444444444444444", messageId: "555555555555555555" },
			{ userId: PLAYER, name: "Alice", private: false },
			250,
		);
		expect(interaction.update).toHaveBeenCalled();
	});

	/** A private table's New round must not hand the table to whoever presses it. */
	it("keeps a private table's new round private, and with its host", async () => {
		await expect(run(pressed(), "again", ["250", "private", "999999999999999999"])).rejects.toThrow(/private/);
		expect(openRound).not.toHaveBeenCalled();

		await run(pressed(), "again", ["250", "private", PLAYER]);
		expect(openRound).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ private: true }), 250);
	});

	it("refuses a second new round on a message that already has one starting", async () => {
		openRound.mockResolvedValue(null);
		await expect(run(pressed(), "again", ["250", "public"])).rejects.toThrow(/already starting/);
	});
});
