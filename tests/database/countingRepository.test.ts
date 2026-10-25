import { describeWithMongo } from "../helpers/mongo";
import { advanceCount, getCounting, resetCount, setCounting } from "@database/repositories/countingRepository";

const GUILD = "900000000000000001";
const CHANNEL = "400000000000000001";
const ALICE = "100000000000000001";
const BOB = "100000000000000002";

describeWithMongo("countingRepository", () => {
	beforeEach(async () => {
		await setCounting(GUILD, CHANNEL, 100);
	});

	it("moves the count on by one and remembers who counted", async () => {
		expect(await advanceCount(GUILD, 1, ALICE)).toMatchObject({ count: 1, lastUserId: ALICE });
		expect(await advanceCount(GUILD, 2, BOB)).toMatchObject({ count: 2, lastUserId: BOB });
	});

	it("refuses a number that is not the next one", async () => {
		expect(await advanceCount(GUILD, 2, ALICE)).toBeNull();
		expect(await getCounting(GUILD)).toMatchObject({ count: 0 });
	});

	it("refuses the same person counting twice in a row", async () => {
		await advanceCount(GUILD, 1, ALICE);

		expect(await advanceCount(GUILD, 2, ALICE)).toBeNull();
		expect(await getCounting(GUILD)).toMatchObject({ count: 1, lastUserId: ALICE });
	});

	/** Two people typing the same number at once must not both be credited with it. */
	it("credits only one of two racing messages", async () => {
		const results = await Promise.all([advanceCount(GUILD, 1, ALICE), advanceCount(GUILD, 1, BOB)]);

		expect(results.filter((result) => result !== null)).toHaveLength(1);
		expect(await getCounting(GUILD)).toMatchObject({ count: 1 });
	});

	it("starts again from nothing, and lets anybody count first", async () => {
		await advanceCount(GUILD, 1, ALICE);
		await resetCount(GUILD);

		expect(await getCounting(GUILD)).toMatchObject({ count: 0, lastUserId: null });
		expect(await advanceCount(GUILD, 1, ALICE)).toMatchObject({ count: 1 });
	});

	it("keeps the count when the channel or the limit changes", async () => {
		await advanceCount(GUILD, 1, ALICE);
		await setCounting(GUILD, "400000000000000002", 50);

		expect(await getCounting(GUILD)).toMatchObject({ channelId: "400000000000000002", maxCount: 50, count: 1 });
	});
});
