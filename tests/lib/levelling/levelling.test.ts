import { type LevelSettings } from "@database/models/levelling.schema";
import { type LevelConfig } from "@lib/levelling/levelling.types";
import {
	clampMultiplier,
	DEFAULT_LEVEL_CONFIG,
	earnsXp,
	LEVEL_LIMITS,
	multiplierFor,
	normaliseSettings,
	progressOf,
	rewardChangeFor,
	type StoredLevelSettings,
	withBoost,
	withReward,
} from "@lib/levelling/levelling.util";

const BOOSTER = "300000000000000001";
const VIP = "300000000000000002";
const MUTED = "300000000000000003";
const CHANNEL = "400000000000000001";

function stored(overrides: Partial<LevelSettings> = {}): StoredLevelSettings {
	return {
		guildId: "1",
		isDisabled: false,
		roleId: null,
		multiplier: 1,
		boosts: [],
		rewards: [],
		stackRewards: true,
		levelUpChannelId: null,
		announce: true,
		ignoredChannelIds: [],
		ignoredRoleIds: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function config(overrides: Partial<LevelConfig> = {}): LevelConfig {
	return { ...DEFAULT_LEVEL_CONFIG, enabled: true, ...overrides };
}

describe("normaliseSettings", () => {
	/** A guild that configured it back then must keep its boost without re-running setup. */
	it("folds the old single boost role into the boosts list", () => {
		const migrated = normaliseSettings(stored({ roleId: BOOSTER, multiplier: 3 }));
		expect(migrated.boosts).toEqual([{ roleId: BOOSTER, multiplier: 3 }]);
	});

	it("ignores the old fields once real boosts exist, so a boost cannot be counted twice", () => {
		const migrated = normaliseSettings(
			stored({ roleId: BOOSTER, multiplier: 3, boosts: [{ roleId: BOOSTER, multiplier: 2 }] }),
		);

		expect(migrated.boosts).toEqual([{ roleId: BOOSTER, multiplier: 2 }]);
	});

	/** A ×1 boost is not a boost, so it must not migrate into a meaningless entry. */
	it("does not migrate a role whose multiplier was left at one", () => {
		expect(normaliseSettings(stored({ roleId: BOOSTER, multiplier: 1 })).boosts).toEqual([]);
	});

	/** `"current"` was the sentinel for "reply where they were talking". */
	it("reads the old current-channel sentinel as no channel", () => {
		expect(normaliseSettings(stored({ levelUpChannelId: "current" })).levelUpChannelId).toBeNull();
	});

	/**
	 * A document written before these fields existed arrives without them, since Mongoose applies defaults only on write.
	 */
	it("fills in fields a document written by the first version does not have", () => {
		const partial = stored();
		delete (partial as Partial<LevelSettings>).boosts;
		delete (partial as Partial<LevelSettings>).rewards;
		delete (partial as Partial<LevelSettings>).stackRewards;
		delete (partial as Partial<LevelSettings>).announce;
		delete (partial as Partial<LevelSettings>).ignoredChannelIds;
		delete (partial as Partial<LevelSettings>).ignoredRoleIds;

		expect(normaliseSettings(partial)).toEqual({ ...DEFAULT_LEVEL_CONFIG, enabled: true });
	});
});

describe("clampMultiplier", () => {
	/** A NaN reaching a canvas or an XP sum poisons everything downstream. */
	it("refuses NaN and infinity", () => {
		expect(clampMultiplier(Number.NaN)).toBe(LEVEL_LIMITS.minMultiplier);
		expect(clampMultiplier(Number.POSITIVE_INFINITY)).toBe(LEVEL_LIMITS.minMultiplier);
	});
});

describe("multiplierFor", () => {
	const boosted = config({
		boosts: [
			{ roleId: BOOSTER, multiplier: 2 },
			{ roleId: VIP, multiplier: 4 },
		],
	});

	/** The best multiplier wins rather than their product. */
	it("takes the best multiplier rather than multiplying them together", () => {
		expect(multiplierFor(boosted, [BOOSTER, VIP])).toBe(4);
	});
});

describe("earnsXp", () => {
	it("skips a member holding an ignored role", () => {
		expect(earnsXp(config({ ignoredRoleIds: [MUTED] }), CHANNEL, [BOOSTER, MUTED])).toBe(false);
	});
});

describe("rewardChangeFor", () => {
	const rewards = [
		{ level: 5, roleId: BOOSTER },
		{ level: 10, roleId: VIP },
	];

	/** Someone who joins mid-way, or has a level set by an admin, is owed every tier. */
	it("catches up every earned reward at once", () => {
		expect(rewardChangeFor(config({ rewards }), 12, []).add).toEqual([BOOSTER, VIP]);
	});

	/** A guild that points two levels at one role must not have it taken away and handed straight back. */
	it("does not strip a role that is also the current tier's reward", () => {
		const reused = [
			{ level: 5, roleId: VIP },
			{ level: 10, roleId: VIP },
		];

		expect(rewardChangeFor(config({ rewards: reused, stackRewards: false }), 10, [VIP])).toEqual({
			add: [],
			remove: [],
		});
	});
});

describe("progressOf", () => {
	/** An admin setting a level by hand leaves XP that does not match its floor. */
	it("clamps XP that sits outside the level's range", () => {
		expect(progressOf(0, 5).progress).toBe(0);
		expect(progressOf(999_999, 1).fraction).toBe(1);
	});
});

describe("withBoost", () => {
	/** Two entries for one role would give the same question two answers. */
	it("replaces the multiplier of a role that is already boosting", () => {
		expect(withBoost([{ roleId: BOOSTER, multiplier: 2 }], BOOSTER, 5)).toEqual([{ roleId: BOOSTER, multiplier: 5 }]);
	});

	it("refuses to grow past the limit", () => {
		const full = Array.from({ length: LEVEL_LIMITS.maxBoosts }, (_, index) => ({
			roleId: `role${index}`,
			multiplier: 2,
		}));

		expect(withBoost(full, "another", 2)).toBe(full);
	});
});

describe("withReward", () => {
	it("refuses to grow past the limit", () => {
		const full = Array.from({ length: LEVEL_LIMITS.maxRewards }, (_, index) => ({
			level: index + 1,
			roleId: `role${index}`,
		}));

		expect(withReward(full, 99, VIP)).toBe(full);
	});
});
