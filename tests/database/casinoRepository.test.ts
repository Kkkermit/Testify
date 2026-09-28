import { describeWithMongo } from "../helpers/mongo";
import { CasinoHand } from "@database/models/casinoHand.schema";
import {
	advanceHand,
	attachHandMessage,
	claimHand,
	expiredHands,
	findHand,
	getCasinoSettings,
	openHand,
	purgeCasino,
	saveCasinoSettings,
} from "@database/repositories/casinoRepository";

const GUILD = "111111111111111111";
const ALICE = "222222222222222222";

function newHand(game: "blackjack" | "hilo" = "blackjack", expiresAt = new Date(Date.now() + 60_000)) {
	return { guildId: GUILD, userId: ALICE, game, bet: 100, staked: 100, state: { cards: [1, 2] }, expiresAt };
}

describeWithMongo("casinoRepository", () => {
	beforeAll(async () => {
		// The unique index is what stops two hands; build it before the first test leans on it.
		await CasinoHand.syncIndexes();
	});

	/** The unique index is the whole guarantee: a check in code can pass twice before either insert lands. */
	it("opens one hand of a game per player per server", async () => {
		const [first, second] = await Promise.all([openHand(newHand()), openHand(newHand())]);

		expect([first, second].filter((hand) => hand !== null)).toHaveLength(1);
		expect(await openHand(newHand("hilo"))).not.toBeNull();
	});

	it("moves a hand on only from the version it was read at", async () => {
		const hand = await openHand(newHand());
		if (hand === null) throw new Error("no hand");

		expect(await advanceHand(hand, { state: { cards: [3] } })).toBe(true);
		expect(await advanceHand(hand, { state: { cards: [4] } })).toBe(false);

		const stored = await findHand(GUILD, ALICE, "blackjack");
		expect(stored).toMatchObject({ version: 1, state: { cards: [3] } });
	});

	/** Whoever claims the hand pays it; a second claim must find nothing, or a stake would be paid twice. */
	it("lets a hand be claimed once", async () => {
		const hand = await openHand(newHand());
		if (hand === null) throw new Error("no hand");

		const claims = await Promise.all([claimHand(hand), claimHand(hand)]);

		expect(claims.filter((claimed) => claimed !== null)).toHaveLength(1);
		expect(await findHand(GUILD, ALICE, "blackjack")).toBeNull();
	});

	it("refuses to claim a hand that has moved on since it was read", async () => {
		const hand = await openHand(newHand());
		if (hand === null) throw new Error("no hand");
		await advanceHand(hand, { state: {} });

		expect(await claimHand(hand)).toBeNull();
	});

	it("lists hands left past their limit, oldest first", async () => {
		await openHand(newHand("blackjack", new Date(Date.now() - 1_000)));
		await openHand(newHand("hilo", new Date(Date.now() - 5_000)));
		await openHand({ ...newHand("blackjack"), userId: "333333333333333333" });

		expect((await expiredHands(new Date(), 10)).map((hand) => hand.game)).toEqual(["hilo", "blackjack"]);
	});

	it("records where a hand is showing", async () => {
		const hand = await openHand(newHand());
		if (hand === null) throw new Error("no hand");
		await attachHandMessage(hand, "444444444444444444", "555555555555555555");

		expect(await findHand(GUILD, ALICE, "blackjack")).toMatchObject({ messageId: "555555555555555555" });
	});

	it("saves settings and reads the saved copy back past the cache", async () => {
		expect(await getCasinoSettings(GUILD)).toBeNull();

		await saveCasinoSettings(GUILD, { enabled: false, disabledGames: ["slots"], minBet: 5, maxBet: null }, ALICE);

		expect(await getCasinoSettings(GUILD)).toMatchObject({ enabled: false, disabledGames: ["slots"], minBet: 5 });
	});

	it("forgets everything about a server it leaves", async () => {
		await saveCasinoSettings(GUILD, { enabled: true, disabledGames: [], minBet: 1, maxBet: 10 }, ALICE);
		await openHand(newHand());

		await purgeCasino(GUILD);

		expect(await getCasinoSettings(GUILD)).toBeNull();
		expect(await findHand(GUILD, ALICE, "blackjack")).toBeNull();
	});
});
