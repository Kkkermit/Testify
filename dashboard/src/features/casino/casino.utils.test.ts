import { type TFunction } from "i18next";
import { draftOf, isDirty, limitsOf, limitsProblem, openGames } from "@/features/casino/casino.utils";

const t = ((key: string) => key) as unknown as TFunction;

describe("the casino's rules on the page", () => {
	it("counts the games still open", () => {
		expect(
			openGames({ games: { roulette: true, blackjack: false, slots: true, hilo: true, coinflip: false, dice: true } }),
		).toBe(4);
	});

	it("shows no ceiling as an empty field", () => {
		expect(draftOf({ minBet: 10, maxBet: null })).toEqual({ min: "10", max: "" });
		expect(draftOf({ minBet: 10, maxBet: 500 })).toEqual({ min: "10", max: "500" });
	});

	it("reads an empty ceiling as none, and refuses anything that is not a whole bet", () => {
		expect(limitsOf({ min: "10", max: "" })).toEqual({ minBet: 10, maxBet: null });
		expect(limitsOf({ min: "10", max: "20" })).toEqual({ minBet: 10, maxBet: 20 });
		expect(limitsOf({ min: "0", max: "" })).toBeNull();
		expect(limitsOf({ min: "1.5", max: "" })).toBeNull();
		expect(limitsOf({ min: "10", max: "x" })).toBeNull();
	});

	it("names what is wrong, in the order a reader would fix it", () => {
		expect(limitsProblem({ min: "", max: "" }, t)).toBe("casino.minBetRange");
		expect(limitsProblem({ min: "5", max: "0" }, t)).toBe("casino.maxBetRange");
		expect(limitsProblem({ min: "50", max: "10" }, t)).toBe("problem.casinoBetRange");
		expect(limitsProblem({ min: "10", max: "" }, t)).toBeNull();
	});

	it("only calls the form changed when a value differs from what is saved", () => {
		expect(isDirty({ min: "10", max: "" }, { minBet: 10, maxBet: null })).toBe(false);
		expect(isDirty({ min: " 10 ", max: "" }, { minBet: 10, maxBet: null })).toBe(false);
		expect(isDirty({ min: "10", max: "5" }, { minBet: 10, maxBet: null })).toBe(true);
	});
});
