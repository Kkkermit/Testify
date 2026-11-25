import { UserFacingError } from "@core/errors";
import { recordCase } from "@lib/moderation/caseActions.util";
import { banUser, kickMember, removeTimeout, timeoutMember } from "@lib/moderation/sanctions.util";

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

describe("the audit log reason", () => {
	/** Discord refuses a kick, ban or timeout whose audit log reason passes 512 characters. */
	it("fits the moderator and a long reason within Discord's 512 characters", async () => {
		const { member, guild } = world();

		await kickMember(guild as never, member as never, MOD, "x".repeat(600));

		const sent = (member.kick.mock.calls as unknown as [string][])[0]![0];
		expect(sent).toHaveLength(512);
		expect(sent.startsWith("mod: x")).toBe(true);
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

	it("tells the member their timeout was lifted in words that read as news, not as something done to them", async () => {
		const { member, guild } = world();
		member.communicationDisabledUntilTimestamp = Date.now() + 60_000;

		await removeTimeout(guild as never, member as never, MOD, "Served its time");

		const [message] = member.user.send.mock.calls[0] as unknown as [{ embeds: { toJSON(): { title?: string } }[] }];
		expect(message.embeds[0]?.toJSON().title).toContain("Your timeout in Test Server was lifted");
	});
});
