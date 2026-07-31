import { accessFor, type AccessInput, canConfigureGuild, canUseOwnerConsole } from "@testify/shared";

const OWNER = "100000000000000001";
const SOMEONE = "100000000000000002";

function input(overrides: Partial<AccessInput> = {}): AccessInput {
	return {
		userId: SOMEONE,
		ownerIds: [OWNER],
		botInGuild: true,
		isMember: true,
		hasManageGuild: true,
		...overrides,
	};
}

describe("accessFor", () => {
	it("recognises a bot owner", () => {
		expect(accessFor(input({ userId: OWNER }))).toBe("owner");
	});

	/** The owner console is not per-guild, so ownership cannot depend on being in the guild being asked about. */
	it("keeps a bot owner an owner in a guild they are not in", () => {
		expect(accessFor(input({ userId: OWNER, botInGuild: false, isMember: false }))).toBe("owner");
	});

	it("calls someone with Manage Server a manager", () => {
		expect(accessFor(input())).toBe("manager");
	});

	it("calls a member without Manage Server a member", () => {
		expect(accessFor(input({ hasManageGuild: false }))).toBe("member");
	});

	/**
	 * The OAuth guild list is a snapshot of what Discord said at login. Someone who has left, or whose guild the
	 * bot was removed from, has to fall all the way out — not merely down to "member".
	 */
	it("makes a non-member a stranger however many permissions the snapshot claims", () => {
		expect(accessFor(input({ isMember: false }))).toBe("stranger");
		expect(accessFor(input({ botInGuild: false }))).toBe("stranger");
	});
});

describe("canConfigureGuild", () => {
	it("admits owners and managers only", () => {
		expect(canConfigureGuild("owner")).toBe(true);
		expect(canConfigureGuild("manager")).toBe(true);
		expect(canConfigureGuild("member")).toBe(false);
		expect(canConfigureGuild("stranger")).toBe(false);
	});
});

describe("canUseOwnerConsole", () => {
	/** A guild owner with Manage Server is not a bot owner, and the console can leave guilds and blacklist people. */
	it("admits the bot owner and nobody else", () => {
		expect(canUseOwnerConsole("owner")).toBe(true);
		expect(canUseOwnerConsole("manager")).toBe(false);
		expect(canUseOwnerConsole("member")).toBe(false);
		expect(canUseOwnerConsole("stranger")).toBe(false);
	});
});
