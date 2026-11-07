import { ageMinutes, ageParts, ageText, raidSummary } from "@/features/raid-protection/raid.utils";
import { i18next } from "@/i18n";

describe("raidSummary", () => {
	const t = i18next.getFixedT("en");
	const on = { enabled: true, minAccountAgeMinutes: 10_080, alertChannelId: "1" };

	/** Raid protection never kicks, so the sentence says only what it holds back and where it tells staff. */
	it("says who is held back and where a spike is reported", () => {
		expect(raidSummary({ ...on, enabled: false }, "#staff", t)).toBe(
			"Raid protection is off, so new accounts and spikes in joins go unnoticed.",
		);
		expect(raidSummary({ ...on, alertChannelId: null }, "", t)).toBe(
			"Accounts younger than 7 days are held back. A spike in joins is not reported.",
		);
		expect(raidSummary({ ...on, minAccountAgeMinutes: 0 }, "#staff", t)).toBe(
			"New accounts are let in, and a spike in joins is reported in #staff.",
		);
		expect(raidSummary({ ...on, minAccountAgeMinutes: 90 }, "#staff", t)).toBe(
			"Accounts younger than 90 minutes are held back, and a spike in joins is reported in #staff.",
		);
	});
});

describe("the minimum account age", () => {
	it("is shown in the largest unit it divides into whole, and worded in it", () => {
		expect([0, 45, 120, 1_440, 1_500, 40_320].map((minutes) => [ageParts(minutes), ageText(minutes)])).toEqual([
			[{ value: 0, unit: "minutes" }, "0 minutes"],
			[{ value: 45, unit: "minutes" }, "45 minutes"],
			[{ value: 2, unit: "hours" }, "2 hours"],
			[{ value: 1, unit: "days" }, "1 day"],
			[{ value: 25, unit: "hours" }, "25 hours"],
			[{ value: 28, unit: "days" }, "28 days"],
		]);
	});

	/** Discord's longest timeout is 28 days, so a longer minimum could never hold anybody long enough. */
	it("takes a whole number in any unit up to 28 days, and nothing else", () => {
		const read = Object.fromEntries(
			(
				[
					["30", "minutes"],
					["12", "hours"],
					["28", "days"],
					["672", "hours"],
					["0", "days"],
					["29", "days"],
					["673", "hours"],
					["1.5", "hours"],
					["-1", "minutes"],
					["", "days"],
					["1e3", "minutes"],
				] as const
			).map(([raw, unit]) => [`${raw} ${unit}`, ageMinutes(raw, unit)]),
		);

		expect(read).toEqual({
			"30 minutes": 30,
			"12 hours": 720,
			"28 days": 40_320,
			"672 hours": 40_320,
			"0 days": 0,
			"29 days": null,
			"673 hours": null,
			"1.5 hours": null,
			"-1 minutes": null,
			" days": null,
			"1e3 minutes": 1_000,
		});
	});
});
