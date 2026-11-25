import { adjustWallet } from "@database/repositories/economyRepository";
import handler from "@events/message/treasureDrops.event";
import { createMockClient, createMockMessage } from "@tests/helpers/mocks";

jest.mock("@database/repositories/economyRepository", () => ({ adjustWallet: jest.fn() }));
jest.mock("@database/repositories/treasureRepository", () => ({
	getTreasureConfig: jest.fn(() =>
		Promise.resolve({
			isEnabled: true,
			minMessages: 1,
			maxMessages: 1,
			minAmount: 50,
			maxAmount: 50,
			cooldownMs: 60_000,
		}),
	),
}));

describe("treasure drops", () => {
	/** The drop was only reset once the payout had landed, so a message arriving meanwhile found the same treasure. */
	it("pays one drop once, however many messages arrive while it is being paid", async () => {
		const payouts: (() => void)[] = [];
		jest
			.mocked(adjustWallet)
			.mockImplementation(() => new Promise((resolve) => payouts.push(() => resolve({} as never))));
		const client = createMockClient();

		const first = handler.run(createMockMessage({ content: "hello" }), client);
		const second = handler.run(createMockMessage({ content: "hello again" }), client);
		await new Promise((resolve) => setImmediate(resolve));
		for (const pay of payouts) pay();
		await Promise.all([first, second]);

		expect(adjustWallet).toHaveBeenCalledTimes(1);
	});
});
