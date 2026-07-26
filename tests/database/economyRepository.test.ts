import { ECONOMY } from "../../src/config/constants";
import {
	addInventoryItem,
	adjustWallet,
	debitWallet,
	deleteAccount,
	deposit,
	findAccount,
	getGuildTotals,
	getLeaderboard,
	getOrCreateAccount,
	incrementCounters,
	removeInventoryItem,
	requireAccount,
	setCooldown,
	transfer,
	withdraw,
} from "../../src/database/repositories/economyRepository";
import { describeWithMongo, mongoAvailable } from "../helpers/mongo";

const GUILD = "guild-1";
const ALICE = "user-alice";
const BOB = "user-bob";

describeWithMongo("economyRepository", () => {
	it("creates an account with the starting balance", async () => {
		if (!mongoAvailable()) return;

		const account = await getOrCreateAccount(GUILD, ALICE);
		expect(account.wallet).toBe(ECONOMY.startingWallet);
		expect(account.bank).toBe(0);
	});

	it("does not overwrite an existing account", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await adjustWallet(GUILD, ALICE, 1_000);
		const again = await getOrCreateAccount(GUILD, ALICE);

		expect(again.wallet).toBe(ECONOMY.startingWallet + 1_000);
	});

	it("throws a user-facing error when no account exists", async () => {
		if (!mongoAvailable()) return;
		await expect(requireAccount(GUILD, "nobody")).rejects.toThrow(/economy account/);
	});

	/**
	 * The previous code read the document, mutated it and called `save()`. Two
	 * interleaved calls credited both payouts against the same starting balance,
	 * which was exploitable as money duplication.
	 */
	it("keeps concurrent credits from losing writes", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await Promise.all(Array.from({ length: 50 }, () => adjustWallet(GUILD, ALICE, 10)));

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(ECONOMY.startingWallet + 500);
	});

	it("lets only one of two concurrent spends succeed when funds are short", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		const balance = ECONOMY.startingWallet;

		const results = await Promise.all([debitWallet(GUILD, ALICE, balance), debitWallet(GUILD, ALICE, balance)]);

		expect(results.filter(Boolean)).toHaveLength(1);
		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(0);
	});

	it("refuses a debit larger than the balance", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		expect(await debitWallet(GUILD, ALICE, ECONOMY.startingWallet + 1)).toBeNull();
	});

	it("moves money between wallet and bank without changing the total", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await deposit(GUILD, ALICE, 200);
		await withdraw(GUILD, ALICE, 50);

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(ECONOMY.startingWallet - 150);
		expect(account?.bank).toBe(150);
	});

	it("refuses a deposit larger than the wallet", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		expect(await deposit(GUILD, ALICE, 999_999)).toBeNull();
	});

	it("transfers money atomically", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);

		expect(await transfer(GUILD, ALICE, BOB, 100)).toBe(true);
		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(ECONOMY.startingWallet - 100);
		expect((await findAccount(GUILD, BOB))?.wallet).toBe(ECONOMY.startingWallet + 100);
	});

	it("does not credit the recipient when the sender cannot pay", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);

		expect(await transfer(GUILD, ALICE, BOB, 999_999)).toBe(false);
		expect((await findAccount(GUILD, BOB))?.wallet).toBe(ECONOMY.startingWallet);
	});

	it("keeps balances separate per guild", async () => {
		if (!mongoAvailable()) return;

		await adjustWallet(GUILD, ALICE, 500);
		await getOrCreateAccount("guild-2", ALICE);

		expect((await findAccount("guild-2", ALICE))?.wallet).toBe(ECONOMY.startingWallet);
	});

	it("stacks a repeated inventory purchase instead of duplicating the row", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		const item = { itemId: "padlock", name: "Padlock", emoji: "🔒", quantity: 1 };

		await addInventoryItem(GUILD, ALICE, item);
		const account = await addInventoryItem(GUILD, ALICE, item);

		expect(account.inventory).toHaveLength(1);
		expect(account.inventory[0]?.quantity).toBe(2);
	});

	it("lets only one of two concurrent consumers take the last item", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await addInventoryItem(GUILD, ALICE, { itemId: "padlock", name: "Padlock", emoji: "🔒", quantity: 1 });

		const results = await Promise.all([
			removeInventoryItem(GUILD, ALICE, "padlock"),
			removeInventoryItem(GUILD, ALICE, "padlock"),
		]);

		expect(results.filter(Boolean)).toHaveLength(1);
	});

	it("ranks the leaderboard by combined balance", async () => {
		if (!mongoAvailable()) return;

		await adjustWallet(GUILD, ALICE, 100);
		await adjustWallet(GUILD, BOB, 5_000);

		const [top] = await getLeaderboard(GUILD, 5);
		expect(top?.userId).toBe(BOB);
	});

	it("summarises the guild economy", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);

		const totals = await getGuildTotals(GUILD);
		expect(totals.accounts).toBe(2);
		expect(totals.wallet).toBe(ECONOMY.startingWallet * 2);
	});

	it("records cooldowns and counters", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		const at = new Date("2026-01-01T00:00:00Z");

		await setCooldown(GUILD, ALICE, "daily", at);
		await incrementCounters(GUILD, ALICE, { worked: 3 });

		const account = await findAccount(GUILD, ALICE);
		expect(account?.lastDaily?.toISOString()).toBe(at.toISOString());
		expect(account?.worked).toBe(3);
	});

	it("deletes an account", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		expect(await deleteAccount(GUILD, ALICE)).toBe(true);
		expect(await findAccount(GUILD, ALICE)).toBeNull();
	});
});
