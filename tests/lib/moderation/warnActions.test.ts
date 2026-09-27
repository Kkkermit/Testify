import {
	addWarning,
	countWarnings,
	getWarnLadder,
	listGuildWarnings,
	setWarningStep,
} from "@database/repositories/moderationRepository";
import {
	applyWarnStep,
	issueWarning,
	ladderOf,
	readGuildWarnings,
	stepLabel,
	warningActionText,
	warnProblemText,
} from "@lib/moderation/warnActions.util";

jest.mock("@database/repositories/moderationRepository", () => ({
	addWarning: jest.fn(),
	countWarnings: jest.fn(() => Promise.resolve(1)),
	getWarnLadder: jest.fn(() => Promise.resolve(null)),
	listGuildWarnings: jest.fn(() => Promise.resolve([])),
	saveWarnLadder: jest.fn(),
	setWarningStep: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const USER = "100000000000000002";

const added = jest.mocked(addWarning);
const counted = jest.mocked(countWarnings);
const ladder = jest.mocked(getWarnLadder);
const listed = jest.mocked(listGuildWarnings);
const recorded = jest.mocked(setWarningStep);

function world(options: { inServer?: boolean; outranked?: boolean } = {}) {
	const reachable = options.outranked !== true;
	const user = { id: USER, username: "someone", send: jest.fn(() => Promise.resolve()) };
	const member =
		options.inServer === false
			? null
			: {
					user,
					moderatable: reachable,
					kickable: reachable,
					bannable: reachable,
					timeout: jest.fn(() => Promise.resolve()),
					kick: jest.fn(() => Promise.resolve()),
				};
	const guild = { id: GUILD, name: "Test Server", members: { ban: jest.fn(() => Promise.resolve()) } };

	return { user, member, guild };
}

function steps(...actions: Record<string, unknown>[]) {
	ladder.mockResolvedValue({ steps: actions } as never);
}

beforeEach(() => {
	jest.clearAllMocks();
	ladder.mockResolvedValue(null);
	counted.mockResolvedValue(1);
	added.mockResolvedValue({ warnId: "abcd1234", reason: "spam", timestamp: new Date(), edits: [] } as never);
});

describe("ladderOf", () => {
	/** A step written by hand or by an older build must not reach Discord as a timeout of NaN minutes. */
	it("drops a stored step that is not a real one", () => {
		expect(
			ladderOf({ steps: [{ action: "kick" }, { action: "timeout", minutes: 7 }, { action: "explode" }] }).steps,
		).toEqual([{ action: "kick" }]);
	});

	it("reads a stored timeout, and a missing length as no length", () => {
		expect(
			ladderOf({
				steps: [
					{ action: "timeout", minutes: 10 },
					{ action: "ban", minutes: null },
				],
			}).steps,
		).toEqual([{ action: "timeout", minutes: 10 }, { action: "ban" }]);
	});
});

describe("stepLabel", () => {
	it("names every step in plain words", () => {
		expect(stepLabel({ action: "warn" })).toBe("Warning only");
		expect(stepLabel({ action: "timeout", minutes: 10 })).toBe("Time out for 10 minutes");
		expect(stepLabel({ action: "kick" })).toBe("Kick");
		expect(stepLabel({ action: "ban" })).toBe("Ban");
	});
});

describe("issueWarning", () => {
	const moderator = { id: "100000000000000001", tag: "mod" };

	it("records the warning and does nothing more when no steps are set", async () => {
		const { user, member, guild } = world();

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "spam",
		});

		expect(added).toHaveBeenCalledWith(GUILD, USER, "someone", moderator, "spam");
		expect(issued.outcome).toEqual({ count: 1, step: null, problem: null });
		expect(member?.timeout).not.toHaveBeenCalled();
	});

	/** The example asked for: a second warning mutes for ten minutes. */
	it("carries out the step the warning's number lands on", async () => {
		steps({ action: "warn" }, { action: "timeout", minutes: 10 }, { action: "kick" }, { action: "ban" });
		counted.mockResolvedValue(2);
		const { user, member, guild } = world();

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "spam",
		});

		expect(member?.timeout).toHaveBeenCalledWith(600_000, expect.stringContaining("warning 2"));
		expect(issued.outcome.problem).toBeNull();
	});

	/** The list shows what each warning did, which only a record written at the time can say. */
	it("records the step on the warning, and whether it happened", async () => {
		steps({ action: "kick" });
		const { user, member, guild } = world({ outranked: true });

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "x",
		});

		expect(recorded).toHaveBeenCalledWith(GUILD, USER, "abcd1234", "kick", "outranked");
		expect(issued.entry).toMatchObject({ step: "kick", stepProblem: "outranked" });
	});

	it("records nothing more for a server with no punishments", async () => {
		const { user, member, guild } = world();

		await issueWarning({ guild: guild as never, user: user as never, member: member as never, moderator, reason: "x" });

		expect(recorded).not.toHaveBeenCalled();
	});

	it("kicks on the third and bans on the fourth", async () => {
		steps({ action: "warn" }, { action: "timeout", minutes: 10 }, { action: "kick" }, { action: "ban" });
		const third = world();
		counted.mockResolvedValue(3);
		await issueWarning({
			guild: third.guild as never,
			user: third.user as never,
			member: third.member as never,
			moderator,
			reason: "x",
		});
		expect(third.member?.kick).toHaveBeenCalled();

		const fourth = world();
		counted.mockResolvedValue(4);
		await issueWarning({
			guild: fourth.guild as never,
			user: fourth.user as never,
			member: fourth.member as never,
			moderator,
			reason: "x",
		});
		expect(fourth.guild.members.ban).toHaveBeenCalledWith(USER, expect.anything());
	});

	/** A kicked or banned member can no longer be messaged, so the DM has to leave first. */
	it("tells the member before it acts, and says what is coming", async () => {
		steps({ action: "kick" });
		const { user, member, guild } = world();
		const order: string[] = [];
		user.send.mockImplementation(() => {
			order.push("dm");
			return Promise.resolve();
		});
		member?.kick.mockImplementation(() => {
			order.push("kick");
			return Promise.resolve();
		});

		await issueWarning({ guild: guild as never, user: user as never, member: member as never, moderator, reason: "x" });

		expect(order).toEqual(["dm", "kick"]);
		expect(JSON.stringify(user.send.mock.calls[0])).toContain("Kick");
	});

	it("sends nothing when told not to", async () => {
		const { user, member, guild } = world();

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "x",
			notify: false,
		});

		expect(user.send).not.toHaveBeenCalled();
		expect(issued.notified).toBe(false);
	});

	/** The warning still counts; the moderator is told why the step did not happen rather than the command failing. */
	it("keeps the warning and names the reason when the bot is outranked", async () => {
		steps({ action: "kick" });
		const { user, member, guild } = world({ outranked: true });

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "x",
		});

		expect(member?.kick).not.toHaveBeenCalled();
		expect(issued.outcome.problem).toBe("outranked");
	});
});

describe("applyWarnStep", () => {
	it("bans somebody who has already left", async () => {
		const { user, guild } = world({ inServer: false });

		await expect(applyWarnStep(guild as never, user as never, null, { action: "ban" }, "r")).resolves.toBeNull();
		expect(guild.members.ban).toHaveBeenCalled();
	});

	it("cannot time out or kick somebody who has left, and says so", async () => {
		const { user, guild } = world({ inServer: false });

		await expect(applyWarnStep(guild as never, user as never, null, { action: "kick" }, "r")).resolves.toBe("left");
	});

	it("reports Discord refusing rather than throwing", async () => {
		const { user, member, guild } = world();
		member?.timeout.mockRejectedValue(new Error("Missing Permissions"));

		await expect(
			applyWarnStep(guild as never, user as never, member as never, { action: "timeout", minutes: 5 }, "r"),
		).resolves.toBe("refused");
	});
});

describe("warningActionText", () => {
	it("says what a warning did, and when it could not be done", () => {
		expect(warningActionText({ step: "timeout-10", stepProblem: null })).toBe("Time out for 10 minutes");
		expect(warningActionText({ step: "ban", stepProblem: "refused" })).toBe("Ban (not carried out)");
	});

	/** Every warning from before punishments existed was only ever a warning. */
	it("reads a warning with no step as a plain warning", () => {
		expect(warningActionText({})).toBe("Warning only");
		expect(warningActionText({ step: "nonsense", stepProblem: "left" })).toBe("Warning only");
	});
});

describe("warnProblemText", () => {
	it("names the permission the step needed", () => {
		expect(warnProblemText("outranked", { action: "kick" })).toContain("Kick Members");
		expect(warnProblemText("refused", { action: "timeout", minutes: 5 })).toContain("Moderate Members");
		expect(warnProblemText("left", { action: "ban" })).toMatch(/no longer/);
	});
});

describe("readGuildWarnings", () => {
	const at = (day: number) => new Date(Date.UTC(2026, 8, day));
	const entry = (warnId: string, day: number) => ({
		warnId,
		executorId: "1",
		executorTag: "mod",
		reason: "r",
		timestamp: at(day),
		edits: [],
	});

	it("lists every member's warnings together, newest first", async () => {
		listed.mockResolvedValue([
			{ userId: "a", userTag: "alice", warnings: [entry("a1", 1), entry("a2", 5)] },
			{ userId: "b", userTag: "bob", warnings: [entry("b1", 3)] },
		] as never);

		const page = await readGuildWarnings(GUILD, 1);

		expect(page.items.map((warning) => warning.id)).toEqual(["a2", "b1", "a1"]);
		expect(page.items[1]).toMatchObject({ userId: "b", username: "bob" });
		expect(page.total).toBe(3);
	});

	it("lands on the last page rather than an empty one past the end", async () => {
		listed.mockResolvedValue([{ userId: "a", userTag: "alice", warnings: [entry("a1", 1)] }] as never);

		expect((await readGuildWarnings(GUILD, 9)).page).toBe(1);
	});
});
