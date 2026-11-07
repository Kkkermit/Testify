import { ACCESS_AREAS } from "@testify/shared";
import { areaGroups, inOrder, sameAreas } from "@/features/access/access.utils";

describe("the screens a person can be given", () => {
	/** The API opens a list of screens and the picker shows the sidebar's; if the two drifted, a tick would open nothing. */
	it("offers every screen the API can open exactly once, and nothing else", () => {
		const offered = areaGroups().flatMap((group) => group.choices.map((choice) => choice.area));

		expect([...offered].sort()).toEqual([...ACCESS_AREAS].sort());
		expect(new Set(offered).size).toBe(offered.length);
	});

	it("compares two sets of screens whatever order they were ticked in", () => {
		expect(inOrder(["bans", "members", "bans"])).toEqual(["members", "bans"]);
		expect([sameAreas(["bans", "members"], ["members", "bans"]), sameAreas(["bans"], ["members"])]).toEqual([
			true,
			false,
		]);
	});
});
