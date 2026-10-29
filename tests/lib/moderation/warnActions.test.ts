import {
	addWarning,
	countWarnings,
	getWarnLadder,
	setWarningCase,
	setWarningStep,
} from "@database/repositories/moderationRepository";
import { recordCase } from "@lib/moderation/caseActions.util";
import {
	applyWarnStep,
	issueWarning,
	ladderOf,
	warningActionText,
	warnProblemText,
} from "@lib/moderation/warnActions.util";

jest.mock("@database/repositories/moderationRepository", () => ({
	addWarning: jest.fn(),
	countWarnings: jest.fn(() => Promise.resolve(1)),
	getWarnLadder: jest.fn(() => Promise.resolve(null)),
	listGuildWarnings: jest.fn(() => Promise.resolve([])),
	saveWarnLadder: jest.fn(),
	setWarningCase: jest.fn(() => Promise.resolve()),
	setWarningStep: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/moderation/caseActions.util", () => ({ recordCase: jest.fn(() => Promise.resolve({ number: 7 })) }));

const GUILD = "900000000000000001";
const USER = "100000000000000002";

const added = jest.mocked(addWarning);
const counted = jest.mocked(countWarnings);
const ladder = jest.mocked(getWarnLadder);
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
});

describe("issueWarning", () => {
	const moderator = { id: "100000000000000001", tag: "mod" };

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
		// A step that never happened is no case of its own.
		expect(jest.mocked(recordCase).mock.calls.map(([, input]) => input.action)).toEqual(["warn"]);
	});

	/** The warning carries its case number, so the case list does not read it again as an earlier warning. */
	it("ties the warning to its case", async () => {
		const { user, member, guild } = world();

		const issued = await issueWarning({
			guild: guild as never,
			user: user as never,
			member: member as never,
			moderator,
			reason: "x",
		});

		expect(setWarningCase).toHaveBeenCalledWith(GUILD, USER, issued.entry.warnId, 7);
		expect(issued.entry.caseNumber).toBe(7);
	});
});

describe("applyWarnStep", () => {
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
