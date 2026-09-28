import { describeWithMongo } from "../helpers/mongo";
import { ECONOMY } from "@config/constants";
import {
	adjustBank,
	adjustWallet,
	debitWallet,
	deposit,
	findAccount,
	countGlobalAccounts,
	getEconomyRank,
	getEconomyStanding,
	getGlobalLeaderboard,
	getGlobalRank,
	getGlobalStanding,
	getLeaderboard,
	getOrCreateAccount,
	resetGuild,
	transfer,
	withdraw,
} from "@database/repositories/economyRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";
const BOB = "333333333333333333";

describeWithMongo("economyRepository", () => {
	it("creates an account on first use and reuses it after", async () => {
		const first = await getOrCreateAccount(GUILD, ALICE);
		const second = await getOrCreateAccount(GUILD, ALICE);

		expect(second.wallet).toBe(first.wallet);
		expect(await findAccount(GUILD, ALICE)).not.toBeNull();
	});

	it("keeps accounts separate per server", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		expect(await findAccount("444444444444444444", ALICE)).toBeNull();
	});

	it("does not lose concurrent balance changes", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await Promise.all(Array.from({ length: 20 }, () => adjustWallet(GUILD, ALICE, 10)));

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(500 + 200);
	});

	it("refuses to overdraw a wallet", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		expect(await debitWallet(GUILD, ALICE, 10_000)).toBeNull();
		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(500);
	});

	it("moves money between wallet and bank without creating any", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await deposit(GUILD, ALICE, 200);
		await withdraw(GUILD, ALICE, 50);

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(350);
		expect(account?.bank).toBe(150);
	});

	it("transfers all-or-nothing", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);

		expect(await transfer(GUILD, ALICE, BOB, 100)).toBe(true);
		expect(await transfer(GUILD, ALICE, BOB, 10_000)).toBe(false);

		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(400);
		expect((await findAccount(GUILD, BOB))?.wallet).toBe(600);
	});

	it("ranks the leaderboard by the requested field", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);
		await adjustWallet(GUILD, BOB, 1_000);

		const [top] = await getLeaderboard(GUILD, 10, "wallet");
		expect(top?.userId).toBe(BOB);
	});

	it("wipes a server without touching another", async () => {
		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount("444444444444444444", ALICE);

		expect(await resetGuild(GUILD)).toBe(1);
		expect(await findAccount("444444444444444444", ALICE)).not.toBeNull();
	});

	describe("the bot-wide board", () => {
		const OTHER = "555555555555555555";
		const LEFT = "666666666666666666";
		const CAROL = "777777777777777777";

		beforeEach(async () => {
			// Alice is middling in each server but first once they are added up; Bob is richest in one.
			await adjustWallet(GUILD, ALICE, 400);
			await adjustWallet(OTHER, ALICE, 400);
			await adjustWallet(GUILD, BOB, 1_000);
			await adjustBank(GUILD, BOB, 0);
			await adjustWallet(LEFT, CAROL, 100_000);
		});

		it("adds each person's servers together and ranks the people", async () => {
			const board = await getGlobalLeaderboard([GUILD, OTHER], 10, "total");

			expect(board.map((row) => row.userId)).toEqual([ALICE, BOB]);
			expect(board[0]).toMatchObject({ wallet: 800 + ECONOMY.startingWallet * 2, bank: 0 });
		});

		/** A server the bot has left is no longer part of the bot, so its money must not be either. */
		it("leaves out servers it is not asked about", async () => {
			const board = await getGlobalLeaderboard([GUILD, OTHER], 10, "total");

			expect(board.map((row) => row.userId)).not.toContain(CAROL);
			expect(await countGlobalAccounts([GUILD, OTHER])).toBe(2);
		});

		it("ranks by the purse asked for", async () => {
			await adjustBank(OTHER, ALICE, 5_000);

			expect((await getGlobalLeaderboard([GUILD, OTHER], 10, "bank"))[0]?.userId).toBe(ALICE);
			expect(await getGlobalRank([GUILD, OTHER], ALICE, "bank")).toBe(1);
			expect(await getGlobalRank([GUILD, OTHER], BOB, "bank")).toBe(2);
		});

		it("has no rank for somebody with no account in those servers", async () => {
			expect(await getGlobalRank([GUILD, OTHER], CAROL, "total")).toBeNull();
			expect(await getGlobalStanding([GUILD, OTHER], CAROL, "total")).toBeNull();
		});

		/** The reader's own row under the top ten shows these figures, so they must be the added-up ones. */
		it("gives somebody's added-up balances beside their rank", async () => {
			expect(await getGlobalStanding([GUILD, OTHER], ALICE, "total")).toEqual({
				userId: ALICE,
				wallet: 800 + ECONOMY.startingWallet * 2,
				bank: 0,
				total: 800 + ECONOMY.startingWallet * 2,
				rank: 1,
			});
		});

		it("gives somebody's balances in one server beside their rank there", async () => {
			const standing = await getEconomyStanding(GUILD, ALICE, "wallet");

			expect(standing).toMatchObject({ wallet: 400 + ECONOMY.startingWallet, rank: 2 });
			expect(await getEconomyStanding(GUILD, CAROL, "wallet")).toBeNull();
		});

		it("ranks within one server by wallet too", async () => {
			expect(await getEconomyRank(GUILD, BOB, "wallet")).toBe(1);
			expect(await getEconomyRank(GUILD, ALICE, "wallet")).toBe(2);
		});
	});
});
