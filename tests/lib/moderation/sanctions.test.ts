import { UserFacingError } from "@core/errors";
import { recordCase } from "@lib/moderation/caseActions.util";
import { banUser, kickMember, removeTimeout, timeoutMember, unbanUser } from "@lib/moderation/sanctions.util";

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
	it("tells them, then kicks them with the moderator named", async () => {
		const { member, guild } = world();

		await expect(kickMember(guild as never, member as never, MOD, "spam")).resolves.toEqual({ notified: true });
		expect(member.kick).toHaveBeenCalledWith("mod: spam");
		expect(recordCase).toHaveBeenCalledWith(guild, {
			action: "kick",
			user: member.user,
			moderator: MOD,
			reason: "spam",
		});
	});

	it("refuses a member the bot cannot reach", async () => {
		const { member, guild } = world({ reachable: false });

		await expect(kickMember(guild as never, member as never, MOD, "spam")).rejects.toBeInstanceOf(UserFacingError);
		expect(member.kick).not.toHaveBeenCalled();
		expect(recordCase).not.toHaveBeenCalled();
	});
});

describe("banUser", () => {
	it("bans, deleting the days of messages asked for", async () => {
		const { user, member, guild } = world();

		await banUser(guild as never, user as never, member as never, MOD, "spam", 2);

		expect(guild.members.ban).toHaveBeenCalledWith(user.id, { reason: "mod: spam", deleteMessageSeconds: 172_800 });
		expect(recordCase).toHaveBeenCalledWith(guild, { action: "ban", user, moderator: MOD, reason: "spam" });
	});

	/** Somebody who left cannot be messaged, and trying would only fail. */
	it("bans somebody who has left without trying to message them", async () => {
		const { user, guild } = world();

		await expect(banUser(guild as never, user as never, null, MOD, "spam")).resolves.toEqual({ notified: false });
		expect(user.send).not.toHaveBeenCalled();
	});

	it("says so rather than banning twice", async () => {
		const { user, member, guild } = world({ alreadyBanned: true });

		await expect(banUser(guild as never, user as never, member as never, MOD, "spam")).rejects.toThrow(
			/already banned/,
		);
		expect(guild.members.ban).not.toHaveBeenCalled();
	});

	it("refuses a member the bot cannot reach", async () => {
		const { user, member, guild } = world({ reachable: false });

		await expect(banUser(guild as never, user as never, member as never, MOD, "spam")).rejects.toBeInstanceOf(
			UserFacingError,
		);
	});
});

describe("unbanUser", () => {
	it("lifts the ban and records it against the user it was on", async () => {
		const { user, guild } = world({ alreadyBanned: true });

		await expect(unbanUser(guild as never, user.id, MOD, "appeal")).resolves.toBe(user);
		expect(guild.bans.remove).toHaveBeenCalledWith(user.id, "mod: appeal");
		expect(recordCase).toHaveBeenCalledWith(guild, { action: "unban", user, moderator: MOD, reason: "appeal" });
	});

	it("says so when there is no ban to lift", async () => {
		const { user, guild } = world();

		await expect(unbanUser(guild as never, user.id, MOD, "appeal")).rejects.toThrow(/not banned/);
		expect(guild.bans.remove).not.toHaveBeenCalled();
	});
});

describe("timeouts", () => {
	it("times out for the length given, and records how long", async () => {
		const { member, guild } = world();

		await timeoutMember(guild as never, member as never, MOD, 600_000, "spam");

		expect(member.timeout).toHaveBeenCalledWith(600_000, "mod: spam");
		expect(recordCase).toHaveBeenCalledWith(guild, expect.objectContaining({ action: "timeout", durationMs: 600_000 }));
	});

	it("refuses a length Discord will not take, before telling anybody", async () => {
		const { member, guild } = world();

		await expect(timeoutMember(guild as never, member as never, MOD, 29 * 86_400_000, "spam")).rejects.toThrow(
			/28 days/,
		);
		await expect(timeoutMember(guild as never, member as never, MOD, 0, "spam")).rejects.toThrow(/not valid/);
		expect(member.user.send).not.toHaveBeenCalled();
	});

	it("lifts a timeout, and says so when there is none", async () => {
		const { member, guild } = world();
		await expect(removeTimeout(guild as never, member as never, MOD, "sorry")).rejects.toThrow(
			/not currently timed out/,
		);

		member.communicationDisabledUntilTimestamp = Date.now() + 60_000;
		await removeTimeout(guild as never, member as never, MOD, "sorry");

		expect(member.timeout).toHaveBeenCalledWith(null, "mod: sorry");
		expect(recordCase).toHaveBeenCalledWith(guild, expect.objectContaining({ action: "untimeout" }));
	});
});
