import { UserFacingError } from "@core/errors";
import { assertBlacklistable, blacklistProblem } from "@lib/blacklistActions.util";
import { createMockClient } from "@tests/helpers/mocks";

const OWNER = "100000000000000001";
const BOT = "100000000000000009";
const SOMEONE = "100000000000000002";

function clientFor(): ReturnType<typeof createMockClient> {
	return createMockClient({
		isOwner: (id: string) => id === OWNER,
		user: { id: BOT },
	} as never);
}

describe("who may be blacklisted", () => {
	it("allows an ordinary user", () => {
		expect(blacklistProblem(clientFor(), SOMEONE)).toBeNull();
	});

	/** An owner who could block another owner could lock every one of them out of their own bot. */
	it("refuses a bot owner", () => {
		expect(blacklistProblem(clientFor(), OWNER)).toMatch(/bot owner/i);
	});

	/** The gate runs before every command, so blacklisting the bot would refuse the bot's own dispatch. */
	it("refuses the bot itself", () => {
		expect(blacklistProblem(clientFor(), BOT)).toMatch(/bot itself/i);
	});

	it("throws something the user can read", () => {
		expect(() => {
			assertBlacklistable(clientFor(), OWNER);
		}).toThrow(UserFacingError);
	});

	it("throws nothing for somebody who can be blocked", () => {
		expect(() => {
			assertBlacklistable(clientFor(), SOMEONE);
		}).not.toThrow();
	});
});
