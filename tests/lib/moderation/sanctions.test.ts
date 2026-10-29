import { UserFacingError } from "@core/errors";
import { recordCase } from "@lib/moderation/caseActions.util";
import { banUser, kickMember, timeoutMember } from "@lib/moderation/sanctions.util";

jest.mock("@lib/moderation/caseActions.util", () => ({ recordCase: jest.fn(() => Promise.resolve(null)) }));

const MOD = { id: "100000000000000001", name: "mod" };

function world(options: { reachable?: boolean; alreadyBanned?: boolean } = {}) {
	const reachable = options.reachable !== false;
	const user = { id: "100000000000000002", username: "someone", send: jest.fn(() => Promise.resolve()) };
	const member = {
		user,
		kickable: reachable,
		bannable: reachable,
		moderatable: reachable,
		communicationDisabledUntilTimestamp: null as number | null,
		kick: jest.fn(() => Promise.resolve()),
		timeout: jest.fn(() => Promise.resolve()),
	};
	const guild = {
		name: "Test Server",
		bans: {
			fetch: jest.fn(() =>
				options.alreadyBanned === true ? Promise.resolve({ user }) : Promise.reject(new Error("none")),
			),
			remove: jest.fn(() => Promise.resolve()),
		},
		members: { ban: jest.fn(() => Promise.resolve()) },
	};

	return { user, member, guild };
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("kickMember", () => {
	it("refuses a member the bot cannot reach", async () => {
		const { member, guild } = world({ reachable: false });

		await expect(kickMember(guild as never, member as never, MOD, "spam")).rejects.toBeInstanceOf(UserFacingError);
		expect(member.kick).not.toHaveBeenCalled();
		expect(recordCase).not.toHaveBeenCalled();
	});
});

describe("banUser", () => {
	/** Somebody who left cannot be messaged, and trying would only fail. */
	it("bans somebody who has left without trying to message them", async () => {
		const { user, guild } = world();

		await expect(banUser(guild as never, user as never, null, MOD, "spam")).resolves.toEqual({ notified: false });
		expect(user.send).not.toHaveBeenCalled();
	});

	it("refuses a member the bot cannot reach", async () => {
		const { user, member, guild } = world({ reachable: false });

		await expect(banUser(guild as never, user as never, member as never, MOD, "spam")).rejects.toBeInstanceOf(
			UserFacingError,
		);
	});
});

describe("timeouts", () => {
	it("refuses a length Discord will not take, before telling anybody", async () => {
		const { member, guild } = world();

		await expect(timeoutMember(guild as never, member as never, MOD, 29 * 86_400_000, "spam")).rejects.toThrow(
			/28 days/,
		);
		await expect(timeoutMember(guild as never, member as never, MOD, 0, "spam")).rejects.toThrow(/not valid/);
		expect(member.user.send).not.toHaveBeenCalled();
	});
});
