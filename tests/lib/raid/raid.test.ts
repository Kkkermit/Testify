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
	it("holds an account until it reaches the minimum age", () => {
		expect(holdUntil(NOW - 2 * DAY_MS, 7, NOW)).toBe(NOW + 5 * DAY_MS);
	});

	it("lets through an account exactly old enough, and everybody when the minimum is 0", () => {
		expect(holdUntil(NOW - 7 * DAY_MS, 7, NOW)).toBeNull();
		expect(holdUntil(NOW, 0, NOW)).toBeNull();
	});

	/** The longest minimum is Discord's longest timeout, so a brand new account is never held past it. */
	it("never holds for longer than Discord's longest timeout", () => {
		const until = holdUntil(NOW, RAID_LIMITS.maxAccountAgeDays, NOW);
		expect(until).toBe(NOW + 28 * DAY_MS);
	});
});

describe("JoinWatch", () => {
	it("reports a spike the moment the window fills, newest first", () => {
		const watch = new JoinWatch();
		expect(watch.record(GUILD, join(1, NOW), SETTINGS)).toBeNull();
		expect(watch.record(GUILD, join(2, NOW + 1_000, true), SETTINGS)).toBeNull();

		const spike = watch.record(GUILD, join(3, NOW + 2_000), SETTINGS);

		expect(spike).toEqual(expect.objectContaining({ joins: 3, minutes: 1, held: 1 }));
		expect(spike?.newest.map((entry) => entry.username)).toEqual(["user3", "user2", "user1"]);
	});

	it("does not count joins older than the window", () => {
		const watch = new JoinWatch();
		watch.record(GUILD, join(1, NOW), SETTINGS);
		watch.record(GUILD, join(2, NOW + 1_000), SETTINGS);

		expect(watch.record(GUILD, join(3, NOW + MINUTE_MS), SETTINGS)).toBeNull();
	});

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

	it("keeps each server's joins apart", () => {
		const watch = new JoinWatch();
		watch.record(GUILD, join(1, NOW), SETTINGS);
		watch.record(GUILD, join(2, NOW), SETTINGS);

		expect(watch.record("900000000000000002", join(3, NOW), SETTINGS)).toBeNull();
	});

	it("names at most the newest few", () => {
		const watch = new JoinWatch();
		const many = { spikeJoins: RAID_LIMITS.listed + 5, spikeMinutes: 1 };
		let spike = null;
		for (let n = 1; n <= many.spikeJoins; n += 1) spike = watch.record(GUILD, join(n, NOW), many);

		expect(spike?.joins).toBe(many.spikeJoins);
		expect(spike?.newest).toHaveLength(RAID_LIMITS.listed);
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
