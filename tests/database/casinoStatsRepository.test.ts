import { describeWithMongo } from "../helpers/mongo";
import { CasinoStats } from "@database/models/casinoStats.schema";
import {
	type CasinoPlay,
	purgeCasinoStats,
	readCasinoStats,
	recordCasinoPlays,
} from "@database/repositories/casinoStatsRepository";

const GUILD = "111111111111111111";
const OTHER = "999999999999999999";
const ALICE = "222222222222222222";
const BOB = "333333333333333333";

const play = (overrides: Partial<CasinoPlay>): CasinoPlay => ({
	guildId: GUILD,
	userId: ALICE,
	game: "roulette",
	staked: 100,
	returned: 0,
	...overrides,
});

describeWithMongo("casinoStatsRepository", () => {
	beforeAll(async () => {
		await CasinoStats.syncIndexes();
	});

	beforeEach(async () => {
		await CasinoStats.deleteMany({});
	});

	it("adds every play to the server's totals, counting wins, losses and pushes by what came back", async () => {
		await recordCasinoPlays([
			play({ staked: 100, returned: 200 }),
			play({ staked: 100, returned: 0 }),
			play({ staked: 100, returned: 100 }),
			play({ userId: BOB, game: "slots", staked: 50, returned: 0 }),
		]);

		const { totals } = await readCasinoStats(GUILD, null, ALICE);
		expect(totals).toMatchObject({
			plays: 4,
			wagered: 350,
			returned: 300,
			wins: 1,
			losses: 2,
			pushes: 1,
			players: 2,
		});
		expect(totals.since).toBeInstanceOf(Date);
	});

	/** Two games settling at the same moment must both count, which is what the upsert is for. */
	it("loses no play when many settle at once", async () => {
		await Promise.all(Array.from({ length: 20 }, () => recordCasinoPlays([play({ staked: 10, returned: 20 })])));

		const { totals } = await readCasinoStats(GUILD, null, ALICE);
		expect(totals.plays).toBe(20);
		expect(totals.wagered).toBe(200);
		expect(await CasinoStats.countDocuments({ guildId: GUILD })).toBe(1);
	});

	it("filters to one game, and breaks the whole casino down by game", async () => {
		await recordCasinoPlays([
			play({ game: "roulette", staked: 100, returned: 0 }),
			play({ game: "blackjack", staked: 500, returned: 1_000 }),
		]);

		const roulette = await readCasinoStats(GUILD, "roulette", ALICE);
		expect(roulette.totals.wagered).toBe(100);
		expect(roulette.byGame.map((row) => row.game)).toEqual(["roulette"]);

		const all = await readCasinoStats(GUILD, null, ALICE);
		expect(all.byGame.map((row) => [row.game, row.wagered, row.returned])).toEqual([
			["blackjack", 500, 1_000],
			["roulette", 100, 0],
		]);
	});

	it("names the biggest win, the biggest bet and who is most ahead and most behind", async () => {
		await recordCasinoPlays([
			play({ userId: ALICE, game: "roulette", staked: 100, returned: 3_600 }),
			play({ userId: ALICE, game: "slots", staked: 5_000, returned: 0 }),
			play({ userId: BOB, game: "dice", staked: 1_000, returned: 1_900 }),
		]);

		const report = await readCasinoStats(GUILD, null, BOB);
		expect(report.biggestWin).toEqual({ userId: ALICE, game: "roulette", amount: 3_500 });
		expect(report.biggestBet).toEqual({ userId: ALICE, game: "slots", amount: 5_000 });
		expect(report.topWinner).toEqual({ userId: BOB, amount: 900 });
		expect(report.topLoser).toEqual({ userId: ALICE, amount: -1_500 });
		expect(report.mine).toMatchObject({ plays: 1, wagered: 1_000, returned: 1_900, wins: 1 });
	});

	it("has no standouts on a casino where nobody has come out ahead or behind", async () => {
		await recordCasinoPlays([play({ staked: 100, returned: 100 })]);

		const report = await readCasinoStats(GUILD, null, BOB);
		expect(report.biggestWin).toBeNull();
		expect(report.topWinner).toBeNull();
		expect(report.topLoser).toBeNull();
		expect(report.mine).toBeNull();
	});

	/** Every query filters on the server, so one server's casino never shows in another's. */
	it("keeps each server's casino to itself, and reads an empty one as zeroes", async () => {
		await recordCasinoPlays([play({ guildId: OTHER, staked: 1_000 })]);

		const report = await readCasinoStats(GUILD, null, ALICE);
		expect(report.totals).toMatchObject({ plays: 0, wagered: 0, players: 0, since: null });
		expect(report.byGame).toEqual([]);
	});

	it("forgets a server's casino when the server is purged", async () => {
		await recordCasinoPlays([play({}), play({ guildId: OTHER })]);
		await purgeCasinoStats(GUILD);

		expect(await CasinoStats.countDocuments({ guildId: GUILD })).toBe(0);
		expect(await CasinoStats.countDocuments({ guildId: OTHER })).toBe(1);
	});
});
