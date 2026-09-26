import { DAY_MS, WEEK_MS } from "@config/constants";
import { countMembers } from "@lib/info/memberCount.util";

const NOW = 1_800_000_000_000;

const person = (joinedAgo: number | null, bot = false) => ({
	bot,
	joinedTimestamp: joinedAgo === null ? null : NOW - joinedAgo,
});

describe("countMembers", () => {
	it("splits people from bots and counts recent joins", () => {
		const members = [person(1_000), person(DAY_MS + 1), person(WEEK_MS + 1), person(2 * WEEK_MS, true)];

		expect(countMembers(4, members, NOW)).toEqual({ total: 4, people: 3, bots: 1, joinedDay: 1, joinedWeek: 2 });
	});

	/** Without the members intent the cache holds only some members, and Discord's own total is the true one. */
	it("takes the total from Discord rather than from the members it could see", () => {
		expect(countMembers(500, [person(1_000, true)], NOW)).toMatchObject({ total: 500, people: 499, bots: 1 });
	});

	it("does not count a member whose join time is unknown as recent", () => {
		expect(countMembers(1, [person(null)], NOW)).toMatchObject({ joinedDay: 0, joinedWeek: 0 });
	});

	it("puts the edge of each window outside it", () => {
		expect(countMembers(2, [person(DAY_MS), person(WEEK_MS)], NOW)).toMatchObject({ joinedDay: 0, joinedWeek: 1 });
	});

	it("never reports fewer than no people", () => {
		expect(countMembers(0, [person(1_000, true)], NOW).people).toBe(0);
	});
});
