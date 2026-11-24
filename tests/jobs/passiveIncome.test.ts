import { creditBank, incomeEarners } from "@database/repositories/economyRepository";
import { payPassiveIncome } from "@jobs/passiveIncome.util";
import { findBusiness, findHouse } from "@lib/economy";
import { createMockClient, GUILD_ID } from "@tests/helpers/mocks";

jest.mock("@database/repositories/economyRepository", () => ({
	creditBank: jest.fn(() => Promise.resolve()),
	incomeEarners: jest.fn(),
}));
jest.mock("@lib/economy", () => ({
	findHouse: jest.fn(() => ({ income: 100 })),
	findBusiness: jest.fn(() => ({ income: 25 })),
}));

describe("passive income", () => {
	/** A stored record can lack either field, and reading through one that was missing threw out of the whole job. */
	it("pays each owner their house and businesses, whichever of them the record holds", async () => {
		// `for await` reads a plain array as well as a cursor.
		const accounts = [
			{ guildId: GUILD_ID, userId: "a", house: { houseId: "hut" }, businesses: [{ businessId: "stall" }] },
			{ guildId: GUILD_ID, userId: "b", businesses: [{ businessId: "stall" }, { businessId: "stall" }] },
			{ guildId: GUILD_ID, userId: "c", house: { houseId: "hut" } },
			{ guildId: GUILD_ID, userId: "d", house: null, businesses: [] },
		];
		jest.mocked(incomeEarners).mockReturnValue(accounts as never);

		await payPassiveIncome(createMockClient());

		expect(jest.mocked(creditBank).mock.calls).toEqual([
			[GUILD_ID, "a", 125],
			[GUILD_ID, "b", 50],
			[GUILD_ID, "c", 100],
		]);
		expect(findHouse).toHaveBeenCalledWith("hut");
		expect(findBusiness).toHaveBeenCalledWith("stall");
	});
});
