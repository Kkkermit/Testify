import { accessOpens } from "@api/middleware/access";

const GUILD = "900000000000000001";
const at = (rest: string) => `/api/guilds/${GUILD}${rest}`;

/** A spelling the allowlist reads differently from the router would open another screen to somebody given one. */
describe("accessOpens", () => {
	it("opens a granted screen's routes and the shared reads, spelled exactly, and nothing else", () => {
		const cases: Record<string, [readonly string[], string, string, boolean]> = {
			"a granted screen": [["welcome"], "PATCH", at("/welcome"), true],
			"the screen's second route": [["welcome"], "PUT", at("/goodbye"), true],
			"below a granted screen": [["tickets"], "POST", at("/tickets/open/abc/close"), true],
			"the shared channel list": [["bans"], "GET", at("/channels"), true],
			"member search for warnings": [["warnings"], "GET", at("/members/search"), true],
			"a member's page for warnings": [["warnings"], "GET", at("/members/100000000000000002"), false],
			"writing the channel list": [["bans"], "POST", at("/channels"), false],
			"a screen not granted": [["welcome"], "GET", at("/settings"), false],
			"the access panel": [[...["members", "settings", "commands"]], "GET", at("/access"), false],
			"the backup": [["settings"], "GET", at("/backup/program"), false],
			"a name that only starts the same": [["sticky"], "GET", at("/stickyx"), false],
			"a trailing slash": [["bans"], "GET", at("/bans/"), false],
			"a doubled slash": [["bans"], "GET", at("//bans"), false],
			"another case": [["bans"], "GET", at("/Bans"), false],
			"climbing out": [["bans"], "GET", at("/bans/../settings"), false],
			"an encoded slash": [["bans"], "GET", at("/bans%2F..%2Fsettings"), false],
			"a read-only screen written to": [["changes"], "POST", at("/changes"), false],
			"another server's path": [["bans"], "GET", "/api/guilds/900000000000000002/bans", false],
			"nothing granted": [[], "GET", at("/bans"), false],
		};

		const judged = Object.fromEntries(
			Object.entries(cases).map(([label, [areas, method, path]]) => [
				label,
				accessOpens(areas as Parameters<typeof accessOpens>[0], method, path, GUILD),
			]),
		);
		expect(judged).toEqual(Object.fromEntries(Object.entries(cases).map(([label, [, , , open]]) => [label, open])));
	});
});
