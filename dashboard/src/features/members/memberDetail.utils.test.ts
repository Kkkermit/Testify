import { type MemberDetail } from "@testify/shared";
import { clearConfirmed, softbanActive, warningSummary } from "@/features/members/memberDetail.utils";
import { t } from "@/test/english";

function detail(overrides: Partial<MemberDetail> = {}): MemberDetail {
	return {
		userId: "100000000000000002",
		displayName: "kate",
		username: "kate",
		avatarUrl: null,
		inGuild: true,
		isBot: false,
		joinedAt: "2026-01-04T00:00:00.000Z",
		nickname: null,
		timedOutUntil: null,
		roles: [],
		economy: null,
		levels: null,
		warnings: [],
		softban: null,
		moderationProblem: null,
		...overrides,
	};
}

describe("softbanActive", () => {
	const softban = { reason: "Spam", moderatorId: "1", expiresAt: "2026-08-10T00:00:00.000Z" };

	/** The sweep job runs on a timer, so a lapsed record can outlive the restriction it describes. */
	it("is not active once the expiry has passed", () => {
		expect(softbanActive(detail({ softban }), Date.parse("2026-08-11T00:00:00.000Z"))).toBe(false);
	});
});

describe("warningSummary", () => {
	it.each([
		[1, "1 warning on record."],
		[2, "2 warnings on record."],
	])("counts %p", (count, expected) => {
		const warnings = Array.from({ length: count }, (_, index) => ({
			id: String(index),
			reason: "x",
			byId: "1",
			byTag: "a",
			at: "2026-08-01T00:00:00.000Z",
			edited: false,
			step: null,
			stepProblem: null,
		}));

		expect(warningSummary(warnings, t)).toBe(expected);
	});
});

describe("clearConfirmed", () => {
	/** The whole point is that a click alone cannot delete a record, so anything else has to be refused. */
	it.each(["", "kat", "someone"])("refuses %p", (typed) => {
		expect(clearConfirmed(typed, detail())).toBe(false);
	});
});
