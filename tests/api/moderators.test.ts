import { openToModerators } from "@api/middleware/moderators";

const GUILD = "900000000000000001";
const at = (rest: string) => `/api/guilds/${GUILD}${rest}`;

/** A spelling the allowlist reads differently from the router would open a setting to a moderator. */
describe("openToModerators", () => {
	it("opens only the moderation routes, spelled exactly, and nothing in another server's path", () => {
		const cases: Record<string, [string, string, boolean]> = {
			"the members list": ["GET", at("/members"), true],
			"a member's roles": ["PUT", at("/members/100000000000000002/roles"), true],
			"a warning": ["DELETE", at("/warnings/100000000000000002/abc"), true],
			"the warning steps": ["PUT", at("/warnings/punishments"), false],
			"reading the warning steps": ["GET", at("/warnings/punishments"), false],
			"deleting the warning steps": ["DELETE", at("/warnings/punishments"), false],
			"the cases' channel": ["PUT", at("/cases/settings"), false],
			"the appeals' settings": ["GET", at("/appeals/settings"), false],
			"a setting": ["GET", at("/welcome"), false],
			"a trailing slash": ["GET", at("/members/"), false],
			"a doubled slash": ["GET", at("//members"), false],
			"another case": ["GET", at("/Members"), false],
			"climbing out of members": ["GET", at("/members/../welcome"), false],
			"an encoded slash": ["GET", at("/members%2F..%2Fwelcome"), false],
			"the wrong method": ["POST", at("/cases"), false],
			"HEAD on a list": ["HEAD", at("/members"), false],
			"another server's id": ["GET", "/api/guilds/900000000000000002/members", false],
			"the server's own root": ["GET", `/api/guilds/${GUILD}`, false],
		};

		const judged = Object.fromEntries(
			Object.entries(cases).map(([label, [method, path]]) => [label, openToModerators(method, path, GUILD)]),
		);
		expect(judged).toEqual(Object.fromEntries(Object.entries(cases).map(([label, [, , open]]) => [label, open])));
	});
});
