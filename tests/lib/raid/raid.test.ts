import { DAY_MS, MINUTE_MS } from "@config/constants";
import { holdUntil, JoinWatch, type WatchedJoin, wholeNumber } from "@lib/raid/raid.util";
import { RAID_LIMITS } from "@testify/shared";

const NOW = Date.UTC(2026, 9, 25, 12);
const GUILD = "900000000000000001";
const SETTINGS = { spikeJoins: 3, spikeMinutes: 1 };

const join = (n: number, at: number, held?: boolean): WatchedJoin => ({
	userId: `10000000000000000${String(n)}`,
	username: `user${String(n)}`,
	createdAt: NOW - DAY_MS,
	at,
	...(held === undefined ? {} : { held }),
});

describe("holdUntil", () => {
	/** The longest minimum is Discord's longest timeout, so a brand new account is never held past it. */
	it("never holds for longer than Discord's longest timeout", () => {
		const until = holdUntil(NOW, RAID_LIMITS.maxAccountAgeDays, NOW);
		expect(until).toBe(NOW + 28 * DAY_MS);
	});
});

describe("JoinWatch", () => {
	/** A raid of a hundred joins must be one alert, not a hundred. */
	it("reports a spike that goes on once, then again only after the alert interval", () => {
		const watch = new JoinWatch();
		for (let n = 1; n <= 3; n += 1) watch.record(GUILD, join(n, NOW), SETTINGS);

		expect(watch.alerting(GUILD, NOW)).toBe(true);
		expect(watch.record(GUILD, join(4, NOW + 1_000), SETTINGS)).toBeNull();

		const later = NOW + RAID_LIMITS.alertEveryMinutes * MINUTE_MS;
		for (let n = 5; n <= 6; n += 1) watch.record(GUILD, join(n, later), SETTINGS);
		expect(watch.alerting(GUILD, later)).toBe(false);
		expect(watch.record(GUILD, join(7, later), SETTINGS)).toEqual(expect.objectContaining({ joins: 3 }));
	});
});

describe("wholeNumber", () => {
	it("reads a whole number inside the bounds and refuses anything else", () => {
		expect(wholeNumber(" 7 ", 0, 28)).toBe(7);
		expect(wholeNumber("0", 0, 28)).toBe(0);
		expect(wholeNumber("29", 0, 28)).toBeNull();
		expect(wholeNumber("2.5", 0, 28)).toBeNull();
		expect(wholeNumber("-1", 0, 28)).toBeNull();
		expect(wholeNumber("", 0, 28)).toBeNull();
	});
});
