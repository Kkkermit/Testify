import { containsProfanity } from "@lib/contentFilter.util";

/** Guards /say, /impersonate, /suggest and the fake-tweet generator. */
describe("containsProfanity", () => {
	it("passes ordinary text", () => {
		expect(containsProfanity("hello everyone, how are you?")).toBe(false);
	});

	it("passes empty and whitespace", () => {
		expect(containsProfanity("")).toBe(false);
		expect(containsProfanity("   ")).toBe(false);
	});

	it("does not flag a clean word that contains a rude substring", () => {
		for (const innocent of ["assignment", "classic", "Scunthorpe", "analysis"]) {
			expect(containsProfanity(innocent)).toBe(false);
		}
	});
});
