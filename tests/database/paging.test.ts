import { createMockModel, type MockQuery } from "@tests/helpers/mocks";

/**
 * Every paged read has to sort on a total order.
 *
 * `skip`/`limit` ask the database for a window of an ordered result, and MongoDB does not promise any particular
 * order for documents that tie on the sort key — so a leaderboard where two people hold the same amount, or an
 * audit log where two changes land in the same millisecond, can show one row on both pages and drop another.
 * Adding the unique `_id` last makes the order total, which is what makes the window well defined.
 *
 * This lives beside the repository tests rather than inside them because it has to hold without a database: the
 * repository suites skip themselves when no MongoDB is available, and a rule nothing checks on a normal run is
 * one that comes back.
 */

const auditModel = createMockModel();
const levelModel = createMockModel();
const economyModel = createMockModel();

jest.mock("@database/models/dashboardAudit.schema", () => ({ DashboardAudits: auditModel }));
jest.mock("@database/models/levelling.schema", () => ({ UserLevel: levelModel }));
jest.mock("@database/models/economy.schema", () => ({ Economy: economyModel }));

/** The `sort({ … })` a chained query was built with. */
function sortSpecOf(model: Record<string, unknown>): Record<string, number> {
	const find = model["find"] as jest.Mock<MockQuery>;
	const query = find.mock.results.at(-1)?.value as MockQuery;

	return query.sort.mock.calls.at(-1)?.[0] as Record<string, number>;
}

function endsWithId(spec: Record<string, number>): boolean {
	return Object.keys(spec).at(-1) === "_id";
}

beforeEach(() => {
	jest.clearAllMocks();
});

interface Stage {
	$sort?: Record<string, number>;
}

describe("a paged read", () => {
	it("breaks the tie on the audit history with the document id", async () => {
		const { auditPage } = await import("@database/repositories/dashboardAuditRepository");
		await auditPage("900000000000000001", 2, 2);

		expect(endsWithId(sortSpecOf(auditModel))).toBe(true);
	});

	/** The overview card and the audit page read the same collection, so both need the same order. */
	it("breaks the tie on the recent changes too", async () => {
		const { recentAudits } = await import("@database/repositories/dashboardAuditRepository");
		await recentAudits("900000000000000001");

		expect(endsWithId(sortSpecOf(auditModel))).toBe(true);
	});

	it("breaks the tie on the level leaderboard, where everybody starts level zero", async () => {
		const { getLevelLeaderboard } = await import("@database/repositories/levelRepository");
		await getLevelLeaderboard("900000000000000001", 10, 10);

		expect(endsWithId(sortSpecOf(levelModel))).toBe(true);
	});

	it.each(["wallet", "bank"] as const)("breaks the tie on the %s leaderboard", async (field) => {
		const { getLeaderboard } = await import("@database/repositories/economyRepository");
		await getLeaderboard("900000000000000001", 10, field, 10);

		expect(endsWithId(sortSpecOf(economyModel))).toBe(true);
	});

	/** The total board is an aggregation over a computed field, so its sort is a pipeline stage instead. */
	it("breaks the tie on the total leaderboard", async () => {
		const aggregate = jest.fn((_pipeline: Stage[]) => ({ exec: jest.fn(() => Promise.resolve([])) }));
		economyModel["aggregate"] = aggregate;

		const { getLeaderboard } = await import("@database/repositories/economyRepository");
		await getLeaderboard("900000000000000001", 10, "total", 10);

		const sort = aggregate.mock.calls[0]?.[0].find((stage) => stage.$sort !== undefined)?.$sort;

		expect(sort).toBeDefined();
		expect(endsWithId(sort ?? {})).toBe(true);
	});

	/** Ascending or descending is a product choice; being unique is what makes the window well defined. */
	it("puts the id last rather than first, so it decides nothing but the tie", async () => {
		const { getLevelLeaderboard } = await import("@database/repositories/levelRepository");
		await getLevelLeaderboard("900000000000000001", 10);

		expect(Object.keys(sortSpecOf(levelModel))).toEqual(["level", "xp", "_id"]);
	});
});
