import { switchedPath } from "@/app/layout/guildSwitch.utils";
import { aGuild } from "@/test/fixtures/session";

const OTHER = "900000000000000009";

describe("switchedPath", () => {
	/** A member of one server is not a member of the next, so their page would only answer "not found". */
	it("drops anything below the screen, such as a member", () => {
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}/members/123`, search: "" }, { id: OTHER, areas: null })).toBe(
			`/guilds/${OTHER}/members`,
		);
	});

	/** A screen the other server's admins did not give would only refuse the reader, so the switch lands where they can act. */
	it("keeps a screen the other server gave, and sends one it did not to its overview", () => {
		const given = { id: OTHER, areas: ["warnings" as const] };
		const from = (screen: string) => ({ pathname: `/guilds/${aGuild.id}/${screen}`, search: "?tab=steps" });

		expect([switchedPath(from("warnings"), given), switchedPath(from("welcome"), given)]).toEqual([
			`/guilds/${OTHER}/warnings?tab=steps`,
			`/guilds/${OTHER}`,
		]);
	});
});
