import { switchedPath } from "@/app/layout/guildSwitch.utils";
import { aGuild } from "@/test/fixtures/session";

const OTHER = "900000000000000009";

describe("switchedPath", () => {
	/** A member of one server is not a member of the next, so their page would only answer "not found". */
	it("drops anything below the screen, such as a member", () => {
		expect(
			switchedPath({ pathname: `/guilds/${aGuild.id}/members/123`, search: "" }, { id: OTHER, access: "manage" }),
		).toBe(`/guilds/${OTHER}/members`);
	});

	/** The settings screen would only refuse a moderator, so the switch lands where they can act. */
	it("keeps a moderation screen for a server the reader moderates, and sends a setting to its overview", () => {
		const moderated = { id: OTHER, access: "moderate" } as const;
		const from = (screen: string) => ({ pathname: `/guilds/${aGuild.id}/${screen}`, search: "?tab=steps" });

		expect([switchedPath(from("warnings"), moderated), switchedPath(from("welcome"), moderated)]).toEqual([
			`/guilds/${OTHER}/warnings?tab=steps`,
			`/guilds/${OTHER}`,
		]);
	});
});
