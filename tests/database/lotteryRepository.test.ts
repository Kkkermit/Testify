import { describeWithMongo } from "../helpers/mongo";
import { addEntry, claimDueDraw, getLottery, saveLottery } from "@database/repositories/lotteryRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";

async function openLottery(nextDrawTime: Date): Promise<void> {
	await saveLottery(GUILD, {
		entryFee: 10,
		frequency: "daily",
		nextDrawTime,
		announcementChannelId: "333333333333333333",
		lastModifiedBy: ALICE,
	});
}

describeWithMongo("lotteryRepository", () => {
	/** Both entries missed the stack and both pushed, so one person was listed twice. */
	it("keeps one row for somebody entering twice at once, with every ticket and fee", async () => {
		await openLottery(new Date(Date.now() + 60_000));

		await Promise.all([
			addEntry(GUILD, { userId: ALICE, userTag: "alice", tickets: 1 }, 10),
			addEntry(GUILD, { userId: ALICE, userTag: "alice", tickets: 2 }, 20),
		]);

		const lottery = await getLottery(GUILD);
		expect(lottery?.entries.map((entry) => [entry.userId, entry.tickets])).toEqual([[ALICE, 3]]);
		expect(lottery?.prizePool).toBe(30);
	});

	it("claims a due draw once, and answers with the next draw time", async () => {
		const due = new Date(Date.now() - 1_000);
		await openLottery(due);

		const [first, second] = await Promise.all([claimDueDraw(), claimDueDraw()]);
		const claimed = [first, second].filter((draw) => draw !== null);

		expect(claimed).toHaveLength(1);
		expect(claimed[0]?.nextDrawTime.getTime()).toBeGreaterThan(Date.now());
	});
});
