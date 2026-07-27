import { UserFacingError } from "@core/errors";
import { resolveAmount } from "@lib/amount.util";

/** `/deposit 500`, `/deposit half`, `/deposit all` all come through here. */
describe("resolveAmount", () => {
	it("reads a plain number", () => {
		expect(resolveAmount("500", 1_000)).toBe(500);
	});

	it("understands the words for a whole or part balance", () => {
		expect(resolveAmount("all", 1_000)).toBe(1_000);
		expect(resolveAmount("max", 1_000)).toBe(1_000);
		expect(resolveAmount("half", 1_000)).toBe(500);
	});

	it("reads a percentage", () => {
		expect(resolveAmount("25%", 1_000)).toBe(250);
	});

	it("ignores separators people type", () => {
		expect(resolveAmount("1,000", 5_000)).toBe(1_000);
	});

	it("rounds down rather than inventing a fraction of a coin", () => {
		expect(Number.isInteger(resolveAmount("half", 999))).toBe(true);
	});

	/**
	 * A plain number is passed through unchecked — whether it can be afforded is
	 * the caller's business, and the repository decides atomically. Only the
	 * relative forms are bounded by the balance.
	 */
	it("passes a plain number through without checking the balance", () => {
		expect(resolveAmount("2000", 1_000)).toBe(2_000);
	});

	it("refuses zero, a negative and nonsense", () => {
		for (const input of ["0", "-5", "banana", ""]) {
			expect(() => resolveAmount(input, 1_000)).toThrow(UserFacingError);
		}
	});

	it("refuses anything when the balance is empty", () => {
		expect(() => resolveAmount("all", 0)).toThrow(UserFacingError);
	});
});
