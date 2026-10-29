import { UserFacingError } from "@core/errors";
import { resolveAmount } from "@lib/format/amount.util";

/** `/deposit 500`, `/deposit half`, `/deposit all` all come through here. */
describe("resolveAmount", () => {
	/** A plain number passes through; the repository decides atomically whether it can be afforded. */
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
