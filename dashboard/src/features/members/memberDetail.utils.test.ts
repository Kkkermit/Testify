import { type MemberDetail } from "@testify/shared";
import {
	clearConfirmed,
	describeJoined,
	softbanActive,
	statsOf,
	warningSummary,
} from "@/features/members/memberDetail.utils";

function detail(overrides: Partial<MemberDetail> = {}): MemberDetail {
	return {
		userId: "100000000000000002",
		displayName: "kate",
		username: "kate",
		avatarUrl: null,
		inGuild: true,
		isBot: false,
		joinedAt: "2026-01-04T00:00:00.000Z",
		roles: [],
		economy: null,
		levels: null,
		warnings: [],
		softban: null,
		moderationProblem: null,
		...overrides,
	};
}

describe("describeJoined", () => {
	it("says when the date is not known rather than rendering Invalid Date", () => {
		expect(describeJoined(null)).toBe("Join date unknown");
	});
});

describe("softbanActive", () => {
	const softban = { reason: "Spam", moderatorId: "1", expiresAt: "2026-08-10T00:00:00.000Z" };

	it("is active while it has not expired", () => {
		expect(softbanActive(detail({ softban }), Date.parse("2026-08-09T00:00:00.000Z"))).toBe(true);
	});

	/** The sweep job runs on a timer, so a lapsed record can outlive the restriction it describes. */
	it("is not active once the expiry has passed", () => {
		expect(softbanActive(detail({ softban }), Date.parse("2026-08-11T00:00:00.000Z"))).toBe(false);
	});

	it("is not active when there is none", () => {
		expect(softbanActive(detail())).toBe(false);
	});
});

describe("warningSummary", () => {
	it("says none rather than zero", () => {
		expect(warningSummary([])).toBe("No warnings on record.");
	});

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
		}));

		expect(warningSummary(warnings)).toBe(expected);
	});
});

describe("clearConfirmed", () => {
	it("accepts the name as typed", () => {
		expect(clearConfirmed("kate", detail())).toBe(true);
	});

	it("accepts a different case and stray spaces, which are not the mistake this guards against", () => {
		expect(clearConfirmed("  KATE ", detail())).toBe(true);
	});

	/** The whole point is that a click alone cannot delete a record, so anything else has to be refused. */
	it.each(["", "kat", "someone"])("refuses %p", (typed) => {
		expect(clearConfirmed(typed, detail())).toBe(false);
	});
});

describe("statsOf", () => {
	it("shows nothing for somebody with neither an account nor XP", () => {
		expect(statsOf(detail())).toEqual([]);
	});

	it("reports an unranked account rather than a missing row", () => {
		const rows = statsOf(detail({ economy: { wallet: 10, bank: 0, total: 10, rank: null } }));

		expect(rows).toContainEqual({ label: "Money rank", value: "Unranked" });
	});

	it("shows money and levels together when both exist", () => {
		const rows = statsOf(
			detail({
				economy: { wallet: 5_000, bank: 120, total: 5_120, rank: 2 },
				levels: { level: 12, xp: 4_800, rank: 3 },
			}),
		);

		expect(rows.map((row) => row.label)).toEqual(["Wallet", "Bank", "Money rank", "Level", "XP", "Level rank"]);
	});
});
