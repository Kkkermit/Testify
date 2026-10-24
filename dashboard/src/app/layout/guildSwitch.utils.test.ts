import { switchableGuilds, switchedPath } from "@/app/layout/guildSwitch.utils";
import { aGuild, cannotAdd, withoutBot } from "@/test/handlers";

const OTHER = "900000000000000009";

describe("switchedPath", () => {
	it("opens the same screen in the other server", () => {
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}/levelling`, search: "" }, OTHER)).toBe(
			`/guilds/${OTHER}/levelling`,
		);
	});

	it("goes from one overview to the other", () => {
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}`, search: "" }, OTHER)).toBe(`/guilds/${OTHER}`);
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}/`, search: "" }, OTHER)).toBe(`/guilds/${OTHER}`);
	});

	/** A member of one server is not a member of the next, so their page would only answer "not found". */
	it("drops anything below the screen, such as a member", () => {
		expect(switchedPath({ pathname: `/guilds/${aGuild.id}/members/123`, search: "" }, OTHER)).toBe(
			`/guilds/${OTHER}/members`,
		);
	});

	it("keeps the tab and drops a search typed in the old server", () => {
		expect(
			switchedPath({ pathname: `/guilds/${aGuild.id}/levelling`, search: "?tab=rewards&q=someone&page=3" }, OTHER),
		).toBe(`/guilds/${OTHER}/levelling?tab=rewards`);
	});

	it("lands on the overview from a screen outside any server", () => {
		expect(switchedPath({ pathname: "/status", search: "?tab=x" }, OTHER)).toBe(`/guilds/${OTHER}?tab=x`);
	});
});

describe("switchableGuilds", () => {
	it("offers every other server the bot is in, and none it is not", () => {
		const second = { ...aGuild, id: OTHER, name: "Second" };

		expect(switchableGuilds([aGuild, withoutBot, second, cannotAdd], aGuild.id)).toEqual([second]);
	});
});
