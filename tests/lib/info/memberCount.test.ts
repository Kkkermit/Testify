import { countMembers } from "@lib/info/memberCount.util";

const NOW = 1_800_000_000_000;

const person = (joinedAgo: number | null, bot = false) => ({
	bot,
	joinedTimestamp: joinedAgo === null ? null : NOW - joinedAgo,
});

describe("countMembers", () => {
	/** Without the members intent the cache holds only some members, and Discord's own total is the true one. */
	it("takes the total from Discord rather than from the members it could see", () => {
		expect(countMembers(500, [person(1_000, true)], NOW)).toMatchObject({ total: 500, people: 499, bots: 1 });
	});

	it("never reports fewer than no people", () => {
		expect(countMembers(0, [person(1_000, true)], NOW).people).toBe(0);
	});
});
