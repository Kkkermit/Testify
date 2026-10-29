import { switchedPath } from "@/app/layout/guildSwitch.utils";
import { aGuild } from "@/test/fixtures/session";

const OTHER = "900000000000000009";

describe("switchedPath", () => {
	/** A member of one server is not a member of the next, so their page would only answer "not found". */
	it("drops anything below the screen, such as a member", () => {
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}/members/123`, search: "" }, OTHER)).toBe(
			`/guilds/${OTHER}/members`,
		);
	});
});
