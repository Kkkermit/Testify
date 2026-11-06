import { profileProblem } from "@lib/info/profileActions.util";

jest.mock("@lib/moderation/contentFilter.util", () => ({
	containsProfanity: (text: string) => text.includes("rude"),
}));

const fields = { about: "Hi", favouriteSong: "Song", favouriteGame: null, hobbies: null, birthday: null };

describe("what keeps a profile from being saved", () => {
	/** Both surfaces ask this one function, so `/profile set` and the dashboard can never disagree. */
	it("refuses a filtered word in any field, and a birthday that is not a real day", () => {
		const now = new Date("2026-11-05T12:00:00.000Z");

		expect(profileProblem(fields, now)).toBeNull();
		expect(profileProblem({ ...fields, hobbies: "being rude" }, now)).toBe("profanity");
		expect(profileProblem({ ...fields, birthday: "2026-02-30" }, now)).toBe("birthday");
		expect(profileProblem({ ...fields, birthday: "2000-01-01" }, now)).toBeNull();
	});
});
