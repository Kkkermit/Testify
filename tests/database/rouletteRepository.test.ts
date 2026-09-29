import { describeWithMongo } from "../helpers/mongo";
import { RouletteRound } from "@database/models/rouletteRound.schema";
import {
	addBets,
	claimRound,
	clearBets,
	findRound,
	finishRound,
	openRound,
	overdueRounds,
	recentPockets,
	setSeatChip,
	startClock,
} from "@database/repositories/rouletteRepository";

const GUILD = "111111111111111111";
const ALICE = { userId: "222222222222222222", name: "alice" };
const BOB = { userId: "333333333333333333", name: "bob" };

function newRound(closesIn = 20_000, messageId: string | null = null) {
	const closesAt = new Date(Date.now() + closesIn);
	return {
		guildId: GUILD,
		channelId: "444444444444444444",
		messageId,
		hostId: ALICE.userId,
		chip: 100,
		closesAt,
		expiresAt: new Date(closesAt.getTime() + 86_400_000),
	};
}

async function opened(closesIn?: number): Promise<string> {
	const round = await openRound(newRound(closesIn));
	if (round === null) throw new Error("no round");
	return String(round._id);
}

describeWithMongo("rouletteRepository", () => {
	beforeAll(async () => {
		await RouletteRound.syncIndexes();
	});

	/** Two Play again presses on one message must not start two rounds that both edit it. */
	it("opens one round per message while it is taking bets", async () => {
		const [first, second] = await Promise.all([
			openRound(newRound(20_000, "555555555555555551")),
			openRound(newRound(20_000, "555555555555555551")),
		]);

		expect([first, second].filter((round) => round !== null)).toHaveLength(1);
	});

	it("seats several players, each with their own bets", async () => {
		const id = await opened();
		await addBets(id, ALICE, [{ spot: "red", amount: 100 }], 10, Date.now());
		await addBets(id, BOB, [{ spot: "n17", amount: 50 }], 10, Date.now());

		const round = await findRound(id);
		expect(round?.players[ALICE.userId]?.bets).toEqual([{ spot: "red", amount: 100 }]);
		expect(round?.players[BOB.userId]?.bets).toEqual([{ spot: "n17", amount: 50 }]);
		expect(round?.players[ALICE.userId]!.joinedAt).toBeLessThanOrEqual(round!.players[BOB.userId]!.joinedAt);
	});

	/** The limit is part of the update, so ten quick presses cannot land eleven bets. */
	it("never lets one player past the most bets a round allows", async () => {
		const id = await opened();
		const results = await Promise.all(
			Array.from({ length: 14 }, () => addBets(id, ALICE, [{ spot: "odd", amount: 1 }], 10, Date.now())),
		);

		expect(results.filter((result) => result !== null)).toHaveLength(10);
		expect((await findRound(id))?.players[ALICE.userId]?.bets).toHaveLength(10);
		expect(
			await addBets(
				id,
				BOB,
				Array.from({ length: 11 }, () => ({ spot: "odd", amount: 1 })),
				10,
				Date.now(),
			),
		).toBeNull();
	});

	it("refuses a bet once the table has closed, or once it has been spun", async () => {
		const closed = await opened(-1);
		expect(await addBets(closed, ALICE, [{ spot: "red", amount: 1 }], 10, Date.now())).toBeNull();

		const spun = await opened();
		await claimRound(spun, 17);
		expect(await addBets(spun, ALICE, [{ spot: "red", amount: 1 }], 10, Date.now())).toBeNull();
	});

	it("takes bets on a table still waiting for its first, with no countdown", async () => {
		const round = await openRound({ ...newRound(), closesAt: null });
		const id = String(round!._id);

		expect(await addBets(id, ALICE, [{ spot: "red", amount: 1 }], 10, Date.now())).not.toBeNull();
	});

	/** Only the call that starts the clock sets the timer, so two first bets at once cannot start two spins. */
	it("starts the countdown once, however many first bets arrive together", async () => {
		const round = await openRound({ ...newRound(), closesAt: null });
		const id = String(round!._id);
		const closesAt = new Date(Date.now() + 30_000);

		const started = await Promise.all([
			startClock(id, closesAt, new Date()),
			startClock(id, closesAt, new Date()),
			startClock(id, closesAt, new Date()),
		]);

		expect(started.filter(Boolean)).toHaveLength(1);
		expect((await findRound(id))?.closesAt).toEqual(closesAt);
	});

	it("spins a round only once", async () => {
		const id = await opened();
		const [first, second] = await Promise.all([claimRound(id, 5), claimRound(id, 9)]);

		expect([first, second].filter((round) => round !== null)).toHaveLength(1);
	});

	it("clears a player's bets and says what they were, so they can be handed back", async () => {
		const id = await opened();
		await addBets(
			id,
			ALICE,
			[
				{ spot: "red", amount: 100 },
				{ spot: "n3", amount: 100 },
			],
			10,
			Date.now(),
		);

		const before = await clearBets(id, ALICE.userId);
		expect(before?.players[ALICE.userId]?.bets).toHaveLength(2);
		expect((await findRound(id))?.players[ALICE.userId]?.bets).toEqual([]);
		expect(await clearBets(id, ALICE.userId)).toBeNull();
	});

	it("keeps each player's own chip", async () => {
		const id = await opened();
		await setSeatChip(id, BOB, 250, Date.now());

		expect((await findRound(id))?.players[BOB.userId]?.chip).toBe(250);
	});

	/** Choosing a chip before betting seats a player with no bets list, which broke every button on the table. */
	it("reads a player who picked a chip before betting as having no bets, and still takes their first", async () => {
		const id = await opened();
		await setSeatChip(id, BOB, 500, Date.now());

		expect((await findRound(id))?.players[BOB.userId]?.bets).toEqual([]);
		const placed = await addBets(id, BOB, [{ spot: "red", amount: 500 }], 10, Date.now());
		expect(placed?.players[BOB.userId]?.bets).toEqual([{ spot: "red", amount: 500 }]);
		expect(placed?.players[BOB.userId]?.chip).toBe(500);
	});

	it("finds rounds a restart left open past their close", async () => {
		const late = await opened(-120_000);
		await opened(20_000);

		const found = (await overdueRounds(new Date(Date.now() - 60_000), 10)).map((round) => String(round._id));
		expect(found).toContain(late);
		expect(found).toHaveLength(1);
	});

	/** The strip shows this table's spins, newest first, and never a round that did not really spin. */
	it("lists the channel's last spins newest first, leaving out rounds nobody bet on", async () => {
		const settle = async (pocket: number, spun: boolean, channelId = "444444444444444444") => {
			const round = await openRound({ ...newRound(), channelId });
			const id = String(round!._id);
			await claimRound(id, pocket);
			await finishRound(id, spun);
			await new Promise((resolve) => setTimeout(resolve, 5));
		};
		await settle(1, true);
		await settle(2, false);
		await settle(3, true);
		await settle(4, true, "555555555555555559");
		await settle(5, true);

		expect(await recentPockets(GUILD, "444444444444444444", 5)).toEqual([5, 3, 1]);
		expect(await recentPockets(GUILD, "444444444444444444", 2)).toEqual([5, 3]);
		expect(await recentPockets("888888888888888888", "444444444444444444", 5)).toEqual([]);
	});

	it("reads nothing for an id that is not one", async () => {
		expect(await findRound("not-an-id")).toBeNull();
		expect(await addBets("not-an-id", ALICE, [{ spot: "red", amount: 1 }], 10, Date.now())).toBeNull();
	});
});
