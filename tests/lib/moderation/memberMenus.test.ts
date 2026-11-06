import { parseCustomId } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	assertMenuTarget,
	timeoutForm,
	timeoutFromMenu,
	warnForm,
	warnFromMenu,
} from "@lib/moderation/memberMenus.util";
import { createMockMember, createMockUser, OWNER_ID } from "@tests/helpers/mocks";

jest.mock("@lib/moderation/warnActions.util", () => ({
	issueWarning: jest.fn(() =>
		Promise.resolve({ entry: { warnId: "a1" }, outcome: { count: 1, step: null }, notified: true }),
	),
	warnedEmbed: jest.fn(() => ({ title: "warned" })),
}));
jest.mock("@lib/moderation/sanctions.util", () => ({
	moderatorOf: (user: { id: string; username: string }) => ({ id: user.id, name: user.username }),
	timeoutMember: jest.fn(() => Promise.resolve({ notified: false })),
}));

const { issueWarning } = jest.requireMock("@lib/moderation/warnActions.util");
const { timeoutMember } = jest.requireMock("@lib/moderation/sanctions.util");

const BOT = "700000000000000007";
const TARGET = createMockUser({ id: "300000000000000003", username: "bob" });

function server(position: number | null) {
	const guild: Record<string, unknown> = {
		id: "400000000000000004",
		ownerId: "999999999999999999",
		client: { user: { id: BOT } },
	};
	const target =
		position === null
			? null
			: createMockMember({
					id: TARGET.id,
					user: TARGET,
					guild: guild as never,
					roles: { highest: { position } } as never,
				});
	guild.members = {
		me: null,
		fetch: jest.fn(() => (target === null ? Promise.reject(new Error("Unknown")) : Promise.resolve(target))),
	};
	const moderator = createMockMember({
		id: OWNER_ID,
		user: createMockUser({ id: OWNER_ID, username: "mod" }),
		guild: guild as never,
		roles: { highest: { position: 10 } } as never,
	});
	return { guild, moderator, target };
}

beforeEach(() => jest.clearAllMocks());

describe("the right-click forms", () => {
	/** The submit trusts the custom ID for whom to act on, and the router for who may press it. */
	it("carry the target and put the moderator last, as the router checks", () => {
		for (const form of [warnForm(TARGET, OWNER_ID), timeoutForm(TARGET, OWNER_ID)]) {
			const { args } = parseCustomId(form.data.custom_id ?? "");
			expect(args).toEqual([TARGET.id, OWNER_ID]);
		}
	});
});

describe("assertMenuTarget", () => {
	it("refuses a bot, somebody the moderator cannot outrank, and a time out for somebody who left", () => {
		const { moderator, target } = server(20);
		const bot = createMockUser({ id: "300000000000000009", bot: true });

		expect(() => assertMenuTarget(moderator, bot, null, BOT, false)).toThrow(/Bots/);
		expect(() => assertMenuTarget(moderator, TARGET, target, BOT, false)).toThrow(UserFacingError);
		expect(() => assertMenuTarget(moderator, TARGET, null, BOT, true)).toThrow(/not in this server/);
		expect(() => assertMenuTarget(moderator, TARGET, null, BOT, false)).not.toThrow();
	});
});

describe("warnFromMenu", () => {
	/** A warning through the menu is the same warning as `/warn create`: numbered, stepped and sent to them. */
	it("issues the warning through the one path every warning takes", async () => {
		const { moderator, guild, target: member } = server(1);

		await warnFromMenu(moderator, TARGET, "Spam");

		expect(issueWarning).toHaveBeenCalledWith(
			expect.objectContaining({ guild, user: TARGET, member, reason: "Spam", moderator: { id: OWNER_ID, tag: "mod" } }),
		);
	});

	it("refuses an empty reason and an outranked member before anything is written", async () => {
		const { moderator } = server(20);

		await expect(warnFromMenu(moderator, TARGET, "")).rejects.toThrow(/needs a reason/);
		await expect(warnFromMenu(moderator, TARGET, "Spam")).rejects.toThrow(UserFacingError);
		expect(issueWarning).not.toHaveBeenCalled();
	});
});

describe("timeoutFromMenu", () => {
	it("times them out for the length typed, with the default reason when none was given", async () => {
		const { moderator, target: member } = server(1);

		await timeoutFromMenu(moderator, TARGET, "2h", "");

		expect(timeoutMember).toHaveBeenCalledWith(
			expect.anything(),
			member,
			expect.anything(),
			7_200_000,
			"No reason provided",
		);
	});

	it("refuses a length it cannot read", async () => {
		const { moderator } = server(1);

		await expect(timeoutFromMenu(moderator, TARGET, "soon", "")).rejects.toThrow(/not valid/);
		expect(timeoutMember).not.toHaveBeenCalled();
	});
});
