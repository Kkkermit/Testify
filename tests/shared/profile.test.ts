import { birthdayFrom, profileBody, reminderEditBody, reminderTimeProblem } from "@testify/shared";

const NOW = new Date("2026-11-05T12:00:00.000Z");

describe("a profile's rules", () => {
	/** `new Date("2026-02-30")` rolls on to 2 March, which is how the command used to store a day nobody chose. */
	it("takes only a real date, from 1900 to today", () => {
		const read = (raw: string): string | null => birthdayFrom(raw, NOW)?.toISOString().slice(0, 10) ?? null;

		expect(
			Object.fromEntries(
				[
					"1999-04-02",
					"2024-02-29",
					"2026-02-30",
					"2025-02-29",
					"1899-12-31",
					"2026-11-06",
					"99-4-2",
					"2026-13-01",
				].map((raw) => [raw, read(raw)]),
			),
		).toEqual({
			"1999-04-02": "1999-04-02",
			"2024-02-29": "2024-02-29",
			"2026-02-30": null,
			"2025-02-29": null,
			"1899-12-31": null,
			"2026-11-06": null,
			"99-4-2": null,
			"2026-13-01": null,
		});
	});

	it("stores a blank optional field as nothing, and refuses a bio that is only spaces or invisible characters", () => {
		const parsed = profileBody.parse({
			about: "Hi",
			favouriteSong: "Song",
			favouriteGame: "   ",
			hobbies: null,
			birthday: null,
		});
		expect(parsed).toMatchObject({ favouriteGame: null, hobbies: null });

		expect(profileBody.safeParse({ ...parsed, about: " ​​ " }).success).toBe(false);
		expect(profileBody.safeParse({ ...parsed, about: "x".repeat(501) }).success).toBe(false);
	});
});

describe("a reminder's time", () => {
	it("is at least a minute away and at most a year", () => {
		expect(reminderTimeProblem(new Date(NOW.getTime() + 30_000), NOW)).toBe("tooSoon");
		expect(reminderTimeProblem(new Date(NOW.getTime() + 366 * 86_400_000), NOW)).toBe("tooLate");
		expect(reminderTimeProblem(new Date(NOW.getTime() + 3_600_000), NOW)).toBeNull();
		expect(reminderEditBody.safeParse({ text: "Hi", dueAt: "tomorrow" }).success).toBe(false);
	});
});
