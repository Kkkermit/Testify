import { UserFacingError } from "@core/errors";
import {
	adjustBank,
	adjustWallet,
	debitBank,
	debitWallet,
	findAccount,
} from "@database/repositories/economyRepository";
import { changeMoney } from "@lib/economy/memberActions.util";

jest.mock("@database/repositories/economyRepository", () => ({
	adjustBank: jest.fn(() => Promise.resolve({ wallet: 100, bank: 300 })),
	adjustWallet: jest.fn(() => Promise.resolve({ wallet: 300, bank: 100 })),
	debitBank: jest.fn(() => Promise.resolve(null)),
	debitWallet: jest.fn(() => Promise.resolve(null)),
	findAccount: jest.fn(() => Promise.resolve({ wallet: 40, bank: 60 })),
}));

const GUILD = "900000000000000001";
const MEMBER = "100000000000000002";

beforeEach(() => {
	jest.clearAllMocks();
});

describe("changeMoney", () => {
	it("adds with a plain increment", async () => {
		await expect(changeMoney(GUILD, MEMBER, "wallet", 200)).resolves.toEqual({ wallet: 300, bank: 100 });
		expect(adjustWallet).toHaveBeenCalledWith(GUILD, MEMBER, 200);
	});

	/** The page checked the balance, then took the money with a plain `$inc`, so a spend in between overdrew it. */
	it("takes only what the balance still holds, and refuses rather than overdrawing", async () => {
		const outcomes = await Promise.all(
			(["wallet", "bank"] as const).map((purse) =>
				changeMoney(GUILD, MEMBER, purse, -100).catch((error: unknown) => error),
			),
		);

		expect(outcomes.map((outcome) => (outcome instanceof UserFacingError ? outcome.message : outcome))).toEqual([
			"They only have 40 in their wallet.",
			"They only have 60 in their bank.",
		]);
		expect([debitWallet, debitBank].map((debit) => jest.mocked(debit).mock.calls[0])).toEqual([
			[GUILD, MEMBER, 100],
			[GUILD, MEMBER, 100],
		]);
		expect(adjustWallet).not.toHaveBeenCalled();
		expect(adjustBank).not.toHaveBeenCalled();
		expect(findAccount).toHaveBeenCalledWith(GUILD, MEMBER);
	});
});
