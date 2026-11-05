import { type FeatureStatus, type GuildOverview, type ManageableGuild } from "@testify/shared";
import {
	chosenFrom,
	comparable,
	COMPARE_LIMITS,
	compareRows,
	missingDiffers,
	rowDiffers,
} from "@/features/compare/compare.utils";

const guild = (id: string, overrides: Partial<ManageableGuild> = {}): ManageableGuild => ({
	id,
	name: `Server ${id}`,
	iconUrl: null,
	memberCount: 10,
	botPresent: true,
	canInvite: true,
	...overrides,
});
const feature = (key: string, overrides: Partial<FeatureStatus> = {}): FeatureStatus => ({
	key,
	label: key,
	enabled: true,
	detail: null,
	...overrides,
});
const overview = (features: FeatureStatus[], missingPermissions: GuildOverview["missingPermissions"] = []) =>
	({ features, missingPermissions }) as GuildOverview;

describe("comparable", () => {
	/** A server without the bot has nothing to compare, and one the reader cannot manage would only be refused. */
	it("keeps only servers with the bot that the reader could manage", () => {
		const ids = comparable([guild("1"), guild("2", { botPresent: false }), guild("3", { canInvite: false })]).map(
			(g) => g.id,
		);

		expect(ids).toEqual(["1"]);
	});
});

describe("chosenFrom", () => {
	const candidates = ["1", "2", "3", "4", "5"].map((id) => guild(id));

	it("opens on the first few, and keeps an emptied choice empty", () => {
		expect(chosenFrom(null, candidates)).toHaveLength(COMPARE_LIMITS.firstShown);
		expect(chosenFrom("", candidates)).toEqual([]);
	});

	/** The address is typed by anybody, so an id that is not one of the reader's servers is dropped rather than asked. */
	it("drops servers it may not show, repeats and anything past the limit", () => {
		expect(chosenFrom("2,9,2,1,3,4,5", candidates)).toEqual(["2", "1", "3", "4"]);
	});
});

describe("compareRows", () => {
	it("lists every feature any server reports, waiting columns as unknown and missing ones as absent", () => {
		const rows = compareRows([overview([feature("welcome")]), undefined, overview([feature("starboard")])]);

		expect(rows.map((row) => row.key)).toEqual(["welcome", "starboard"]);
		expect(rows[0]?.cells.map((cell) => (cell === undefined ? "waiting" : cell === null ? "absent" : "here"))).toEqual([
			"here",
			"waiting",
			"absent",
		]);
	});
});

describe("rowDiffers", () => {
	/** Two servers can never post in the same channel, so a different channel alone is not a different setup. */
	it("ignores which channel, and counts being on, off or set up differently", () => {
		const posting = (channelId: string) => feature("welcome", { detail: { kind: "posting", channelId } });

		expect(rowDiffers([posting("1"), posting("2")])).toBe(false);
		expect(rowDiffers([posting("1"), { ...posting("2"), enabled: false }])).toBe(true);
		expect(rowDiffers([posting("1"), feature("welcome")])).toBe(true);
		expect(rowDiffers([posting("1"), undefined])).toBe(false);
	});

	it("compares the missing permissions in any order", () => {
		expect(
			missingDiffers([
				overview([], ["ManageRoles", "ManageMessages"]),
				overview([], ["ManageMessages", "ManageRoles"]),
			]),
		).toBe(false);
		expect(missingDiffers([overview([], ["ManageRoles"]), overview([])])).toBe(true);
	});
});
