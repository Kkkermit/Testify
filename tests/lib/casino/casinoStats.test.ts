import { type CasinoStatsReport } from "@database/repositories/casinoStatsRepository";
import { casinoStatsEmbed, houseLine, percent } from "@lib/casino/casinoStats.util";

const ALICE = "222222222222222222";
const BOB = "333333333333333333";

function report(overrides: Partial<CasinoStatsReport> = {}): CasinoStatsReport {
	return {
		totals: {
			plays: 200,
			wagered: 100_000,
			returned: 96_000,
			wins: 90,
			losses: 100,
			pushes: 10,
			players: 12,
			since: new Date(1_700_000_000_000),
		},
		byGame: [
			{ game: "roulette", plays: 120, wagered: 60_000, returned: 58_000, wins: 50, losses: 65, pushes: 5 },
			{ game: "slots", plays: 80, wagered: 40_000, returned: 38_000, wins: 40, losses: 35, pushes: 5 },
		],
		biggestWin: { userId: ALICE, game: "roulette", amount: 35_000 },
		biggestBet: { userId: BOB, game: "slots", amount: 10_000 },
		topWinner: { userId: ALICE, amount: 12_000 },
		topLoser: { userId: BOB, amount: -8_000 },
		mine: { plays: 20, wagered: 5_000, returned: 6_200, wins: 11, losses: 8, pushes: 1 },
		...overrides,
	};
}

function fieldsOf(built: ReturnType<typeof casinoStatsEmbed>): Record<string, string> {
	return Object.fromEntries((built.data.fields ?? []).map((field) => [field.name, field.value]));
}

describe("the casino stats card", () => {
	it("works out rates to one decimal place, and never divides by nothing", () => {
		expect(percent(45, 100)).toBe("45%");
		expect(percent(1, 3)).toBe("33.3%");
		expect(percent(5, 0)).toBe("0%");
	});

	it("says what the house kept, or that the players are ahead", () => {
		expect(houseLine({ wagered: 100_000, returned: 96_000 })).toBe("**4,000** · 4% of every bet");
		expect(houseLine({ wagered: 1_000, returned: 1_500 })).toBe("**−500** · the players are ahead");
	});

	it("shows what was gambled, paid out and kept, the win rate and the standouts", () => {
		const fields = fieldsOf(casinoStatsEmbed(report(), { game: null, guildName: "Rice" }));

		expect(fields["🎲 Games played"]).toContain("**200**");
		expect(fields["🎲 Games played"]).toContain("by 12 players");
		expect(fields["💰 Wagered"]).toBe("**100,000**");
		expect(fields["🏦 Paid out"]).toBe("**96,000**");
		expect(fields["🏠 House take"]).toBe("**4,000** · 4% of every bet");
		expect(fields["📈 Win rate"]).toContain("**45%**");
		expect(fields["📈 Win rate"]).toContain("90 won · 10 even · 100 lost");
		expect(fields["🔁 Paid back"]).toContain("**96%**");
		expect(fields["🏆 Biggest win"]).toBe(`**35,000** by <@${ALICE}> at Roulette`);
		expect(fields["💎 Biggest bet"]).toBe(`**10,000** by <@${BOB}> at Slots`);
		expect(fields["🍀 Furthest ahead"]).toBe(`**+12,000** by <@${ALICE}>`);
		expect(fields["💸 Furthest behind"]).toBe(`**−8,000** by <@${BOB}>`);
		expect(fields["🙋 Your record"]).toBe("**20** plays · 5,000 bet · **+1,200** overall · 55% won");
	});

	it("breaks the whole casino down by game, and names the games nobody has played", () => {
		const byGame = fieldsOf(casinoStatsEmbed(report(), { game: null, guildName: "Rice" }))["🎮 By game"];

		expect(byGame).toContain("🎡 Roulette · **120** plays · 60,000 bet · house +2,000 · 41.7% won");
		expect(byGame).toContain("Not played yet: Blackjack, Hi-Lo, Coinflip, Dice");
	});

	it("titles one game's card after it, with no per-game breakdown", () => {
		const built = casinoStatsEmbed(report(), { game: "roulette", guildName: "Rice" });

		expect(built.data.title).toBe("🎡 Roulette stats");
		expect(fieldsOf(built)["🎮 By game"]).toBeUndefined();
		// On one game's card the game is already named, so the standouts do not repeat it.
		expect(fieldsOf(built)["🏆 Biggest win"]).toBe(`**35,000** by <@${ALICE}>`);
	});

	it("says when the reader has not played, and when nobody stands out yet", () => {
		const fields = fieldsOf(
			casinoStatsEmbed(report({ mine: null, topLoser: null }), { game: null, guildName: "Rice" }),
		);

		expect(fields["🙋 Your record"]).toBe("You have not played here yet.");
		expect(fields["💸 Furthest behind"]).toBe("*Nobody yet*");
	});

	it("says nothing has been played rather than showing a card of zeroes", () => {
		const empty = report({
			totals: { plays: 0, wagered: 0, returned: 0, wins: 0, losses: 0, pushes: 0, players: 0, since: null },
		});
		const built = casinoStatsEmbed(empty, { game: "dice", guildName: "Rice" });

		expect(built.data.description).toBe(
			"Nobody has played Dice in **Rice** yet. Every game from now on is counted here.",
		);
		expect(built.data.fields ?? []).toEqual([]);
	});
});
