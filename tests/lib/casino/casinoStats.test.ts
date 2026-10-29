import { type CasinoStatsReport } from "@database/repositories/casinoStatsRepository";
import { casinoStatsEmbed, percent } from "@lib/casino/casinoStats.util";

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
});
