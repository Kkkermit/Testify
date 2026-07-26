import {
	adjustWallet,
	debitWallet,
	deposit,
	findAccount,
	getLeaderboard,
	getOrCreateAccount,
	resetGuild,
	transfer,
	withdraw,
} from "../../src/database/repositories/economyRepository";
import { describeWithMongo, mongoAvailable } from "../helpers/mongo";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";
const BOB = "333333333333333333";

describeWithMongo("economyRepository", () => {
	it("creates an account on first use and reuses it after", async () => {
		if (!mongoAvailable()) return;

		const first = await getOrCreateAccount(GUILD, ALICE);
		const second = await getOrCreateAccount(GUILD, ALICE);

		expect(second.wallet).toBe(first.wallet);
		expect(await findAccount(GUILD, ALICE)).not.toBeNull();
	});

	it("keeps accounts separate per server", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		expect(await findAccount("444444444444444444", ALICE)).toBeNull();
	});

	it("does not lose concurrent balance changes", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await Promise.all(Array.from({ length: 20 }, () => adjustWallet(GUILD, ALICE, 10)));

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(500 + 200);
	});

	it("refuses to overdraw a wallet", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		expect(await debitWallet(GUILD, ALICE, 10_000)).toBeNull();
		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(500);
	});

	it("moves money between wallet and bank without creating any", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await deposit(GUILD, ALICE, 200);
		await withdraw(GUILD, ALICE, 50);

		const account = await findAccount(GUILD, ALICE);
		expect(account?.wallet).toBe(350);
		expect(account?.bank).toBe(150);
	});

	it("transfers all-or-nothing", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);

		expect(await transfer(GUILD, ALICE, BOB, 100)).toBe(true);
		expect(await transfer(GUILD, ALICE, BOB, 10_000)).toBe(false);

		expect((await findAccount(GUILD, ALICE))?.wallet).toBe(400);
		expect((await findAccount(GUILD, BOB))?.wallet).toBe(600);
	});

	it("ranks the leaderboard by the requested field", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount(GUILD, BOB);
		await adjustWallet(GUILD, BOB, 1_000);

		const [top] = await getLeaderboard(GUILD, 10, "wallet");
		expect(top?.userId).toBe(BOB);
	});

	it("wipes a server without touching another", async () => {
		if (!mongoAvailable()) return;

		await getOrCreateAccount(GUILD, ALICE);
		await getOrCreateAccount("444444444444444444", ALICE);

		expect(await resetGuild(GUILD)).toBe(1);
		expect(await findAccount("444444444444444444", ALICE)).not.toBeNull();
	});
});
