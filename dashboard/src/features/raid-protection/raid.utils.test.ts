import { raidSummary } from "@/features/raid-protection/raid.utils";
import { i18next } from "@/i18n";

describe("raidSummary", () => {
	const t = i18next.getFixedT("en");
	const on = { enabled: true, minAccountAgeDays: 7, alertChannelId: "1" };

	/** Raid protection never kicks, so the sentence says only what it holds back and where it tells staff. */
	it("says who is held back and where a spike is reported", () => {
		expect(raidSummary({ ...on, enabled: false }, "#staff", t)).toBe(
			"Raid protection is off, so new accounts and spikes in joins go unnoticed.",
		);
		expect(raidSummary({ ...on, alertChannelId: null }, "", t)).toBe(
			"Accounts younger than 7 days are held back. A spike in joins is not reported.",
		);
		expect(raidSummary({ ...on, minAccountAgeDays: 0 }, "#staff", t)).toBe(
			"New accounts are let in, and a spike in joins is reported in #staff.",
		);
		expect(raidSummary({ ...on, minAccountAgeDays: 1 }, "#staff", t)).toBe(
			"Accounts younger than 1 day are held back, and a spike in joins is reported in #staff.",
		);
	});
});
