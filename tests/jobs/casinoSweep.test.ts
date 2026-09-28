import { Types } from "mongoose";
import { UserFacingError } from "@core/errors";
import { expiredHands, type HandRecord } from "@database/repositories/casinoRepository";
import { settleIdleHands } from "@jobs/casinoSweep.util";
import { settleAbandoned } from "@lib/casino";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/repositories/casinoRepository", () => ({ expiredHands: jest.fn() }));
jest.mock("@lib/casino", () => ({
	...jest.requireActual<object>("@lib/casino"),
	settleAbandoned: jest.fn(),
}));

const spade = (rank: string): unknown => ({ rank, suit: "spades" });

function hand(overrides: Partial<HandRecord> = {}): HandRecord {
	return {
		_id: new Types.ObjectId(),
		guildId: "900000000000000001",
		userId: "100000000000000001",
		game: "blackjack",
		bet: 100,
		staked: 100,
		state: {},
		version: 2,
		channelId: "400000000000000001",
		messageId: "500000000000000001",
		expiresAt: new Date(0),
		...overrides,
	};
}

const settled = {
	game: "blackjack" as const,
	view: {
		state: { player: [spade("10"), spade("9")], dealer: [spade("10"), spade("7")], deck: [], doubled: false },
		bet: 100,
		staked: 100,
		verdict: "win" as const,
		returned: 200,
		wallet: 1_200,
		auto: true,
	},
};

function clientWithChannel(edit: jest.Mock): ReturnType<typeof createMockClient> {
	const client = createMockClient();
	(client.channels as unknown as { fetch: jest.Mock }).fetch = jest.fn(() =>
		Promise.resolve({ isTextBased: () => true, messages: { edit } }),
	);
	return client;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the idle-hand sweep", () => {
	it("plays out each expired hand and updates its table", async () => {
		const edit = jest.fn(() => Promise.resolve());
		jest.mocked(expiredHands).mockResolvedValue([hand()]);
		jest.mocked(settleAbandoned).mockResolvedValue(settled as never);

		await settleIdleHands(clientWithChannel(edit));

		expect(settleAbandoned).toHaveBeenCalledTimes(1);
		expect(edit).toHaveBeenCalledWith("500000000000000001", expect.objectContaining({ attachments: [] }));
	});

	/** The player pressed a button between the listing and the claim, and that press already paid them. */
	it("moves on from a hand its player settled in the meantime", async () => {
		const edit = jest.fn(() => Promise.resolve());
		jest.mocked(expiredHands).mockResolvedValue([hand(), hand()]);
		jest
			.mocked(settleAbandoned)
			.mockRejectedValueOnce(new UserFacingError("moved on"))
			.mockResolvedValueOnce(settled as never);

		await settleIdleHands(clientWithChannel(edit));

		expect(edit).toHaveBeenCalledTimes(1);
	});

	it("still pays a hand whose message is gone", async () => {
		const edit = jest.fn(() => Promise.reject(new Error("Unknown Message")));
		jest.mocked(expiredHands).mockResolvedValue([hand()]);
		jest.mocked(settleAbandoned).mockResolvedValue(settled as never);

		await expect(settleIdleHands(clientWithChannel(edit))).resolves.toBeUndefined();
		expect(settleAbandoned).toHaveBeenCalled();
	});

	it("skips the message for a hand that never recorded one", async () => {
		const edit = jest.fn();
		jest.mocked(expiredHands).mockResolvedValue([hand({ channelId: null, messageId: null })]);
		jest.mocked(settleAbandoned).mockResolvedValue(settled as never);

		await settleIdleHands(clientWithChannel(edit));

		expect(edit).not.toHaveBeenCalled();
	});

	/** Anything but a lost race is a real failure, and has to reach the job's own error report. */
	it("lets an unexpected failure through", async () => {
		jest.mocked(expiredHands).mockResolvedValue([hand()]);
		jest.mocked(settleAbandoned).mockRejectedValue(new Error("database down"));

		await expect(settleIdleHands(clientWithChannel(jest.fn()))).rejects.toThrow("database down");
	});
});
