import { birthdaysOn, dayMonth, daysUntil } from "@lib/birthdays/birthdays.util";
import { daysInMonth, isBirthday } from "@testify/shared";

const on = (iso: string): Date => new Date(`${iso}T12:00:00.000Z`);

describe("birthdaysOn", () => {
	it("is today's day and month, in UTC", () => {
		expect(birthdaysOn(new Date("2026-10-25T23:59:00.000Z"))).toEqual([{ day: 25, month: 10 }]);
	});

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

describe("daysUntil", () => {
	it("counts today as nought and tomorrow as one", () => {
		expect(daysUntil(25, 10, on("2026-10-25"))).toBe(0);
		expect(daysUntil(26, 10, on("2026-10-25"))).toBe(1);
	});

	it("rolls a birthday already gone this year on to next year", () => {
		expect(daysUntil(24, 10, on("2026-10-25"))).toBe(364);
	});

	it("puts a leap-day birthday on the 28th in a year without one", () => {
		expect(daysUntil(29, 2, on("2027-02-27"))).toBe(1);
	});
});

describe("the shared date rules", () => {
	it("knows how long each month is, February at its longest", () => {
		expect([1, 2, 4, 12].map(daysInMonth)).toEqual([31, 29, 30, 31]);
		expect(daysInMonth(13)).toBe(0);
	});

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
