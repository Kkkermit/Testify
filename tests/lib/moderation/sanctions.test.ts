import { UserFacingError } from "@core/errors";
import { banUser, kickMember } from "@lib/moderation/sanctions.util";

function world(options: { reachable?: boolean; alreadyBanned?: boolean } = {}) {
	const reachable = options.reachable !== false;
	const user = { id: "100000000000000002", username: "someone", send: jest.fn(() => Promise.resolve()) };
	const member = { user, kickable: reachable, bannable: reachable, kick: jest.fn(() => Promise.resolve()) };
	const guild = {
		name: "Test Server",
		bans: {
			fetch: jest.fn(() => (options.alreadyBanned === true ? Promise.resolve({}) : Promise.reject(new Error("none")))),
		},
		members: { ban: jest.fn(() => Promise.resolve()) },
	};

	return { user, member, guild };
}

describe("kickMember", () => {
	it("tells them, then kicks them with the moderator named", async () => {
		const { member, guild } = world();

		await expect(kickMember(guild as never, member as never, "mod", "spam")).resolves.toEqual({ notified: true });
		expect(member.kick).toHaveBeenCalledWith("mod: spam");
	});

	it("refuses a member the bot cannot reach", async () => {
		const { member, guild } = world({ reachable: false });

		await expect(kickMember(guild as never, member as never, "mod", "spam")).rejects.toBeInstanceOf(UserFacingError);
		expect(member.kick).not.toHaveBeenCalled();
	});
});

describe("banUser", () => {
	it("bans, deleting the days of messages asked for", async () => {
		const { user, member, guild } = world();

		await banUser(guild as never, user as never, member as never, "mod", "spam", 2);

		expect(guild.members.ban).toHaveBeenCalledWith(user.id, { reason: "mod: spam", deleteMessageSeconds: 172_800 });
	});

	/** Somebody who left cannot be messaged, and trying would only fail. */
	it("bans somebody who has left without trying to message them", async () => {
		const { user, guild } = world();

		await expect(banUser(guild as never, user as never, null, "mod", "spam")).resolves.toEqual({ notified: false });
		expect(user.send).not.toHaveBeenCalled();
	});

	it("says so rather than banning twice", async () => {
		const { user, member, guild } = world({ alreadyBanned: true });

		await expect(banUser(guild as never, user as never, member as never, "mod", "spam")).rejects.toThrow(
			/already banned/,
		);
		expect(guild.members.ban).not.toHaveBeenCalled();
	});

	it("refuses a member the bot cannot reach", async () => {
		const { user, member, guild } = world({ reachable: false });

		await expect(banUser(guild as never, user as never, member as never, "mod", "spam")).rejects.toBeInstanceOf(
			UserFacingError,
		);
	});
});
