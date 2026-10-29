import { birthdaysOn, dayMonth } from "@lib/birthdays/birthdays.util";
import { isBirthday } from "@testify/shared";

const on = (iso: string): Date => new Date(`${iso}T12:00:00.000Z`);

describe("birthdaysOn", () => {
	/** A leap-day birthday would otherwise go unposted three years in four. */
	it("adds the 29th of February on the 28th of a year without one", () => {
		expect(birthdaysOn(on("2027-02-28"))).toEqual([
			{ day: 28, month: 2 },
			{ day: 29, month: 2 },
		]);
		expect(birthdaysOn(on("2028-02-28"))).toEqual([{ day: 28, month: 2 }]);
		expect(birthdaysOn(on("2028-02-29"))).toEqual([{ day: 29, month: 2 }]);
	});
});

describe("the shared date rules", () => {
	it("refuses a day the month does not have", () => {
		expect(isBirthday(29, 2)).toBe(true);
		expect(isBirthday(31, 4)).toBe(false);
		expect(isBirthday(0, 1)).toBe(false);
		expect(isBirthday(1.5, 1)).toBe(false);
	});

	it("writes the day and month, and never a year", () => {
		expect(dayMonth(25, 10)).toBe("25 October");
	});
});
