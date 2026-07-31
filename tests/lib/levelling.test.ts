import { type LevelSettings } from "@database/models/guildSettings.schema";
import {
	clampMultiplier,
	DEFAULT_LEVEL_CONFIG,
	earnsXp,
	LEVEL_LIMITS,
	type LevelConfig,
	multiplierFor,
	nextMultiplier,
	normaliseSettings,
	progressOf,
	rewardChangeFor,
	sortRewards,
	type StoredLevelSettings,
	withBoost,
	withReward,
} from "@lib/levelling.util";

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
	it("treats an unconfigured guild as levelling off", () => {
		expect(normaliseSettings(null)).toEqual(DEFAULT_LEVEL_CONFIG);
	});

	it("reads isDisabled as the inverse of enabled", () => {
		expect(normaliseSettings(stored({ isDisabled: true })).enabled).toBe(false);
		expect(normaliseSettings(stored({ isDisabled: false })).enabled).toBe(true);
	});

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

	it("keeps a real channel", () => {
		expect(normaliseSettings(stored({ levelUpChannelId: CHANNEL })).levelUpChannelId).toBe(CHANNEL);
	});

	/**
	 * Mongoose applies defaults on write, not to documents already on disk, so a record written before these fields
	 * existed arrives without them.
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

	it("sorts rewards by level so the panel lists them in order", () => {
		const settings = stored({
			rewards: [
				{ level: 20, roleId: VIP },
				{ level: 5, roleId: BOOSTER },
			],
		});

		expect(normaliseSettings(settings).rewards.map((reward) => reward.level)).toEqual([5, 20]);
	});

	it("clamps a stored multiplier that is out of range", () => {
		expect(normaliseSettings(stored({ boosts: [{ roleId: VIP, multiplier: 99 }] })).boosts[0]?.multiplier).toBe(
			LEVEL_LIMITS.maxMultiplier,
		);
	});
});

describe("clampMultiplier", () => {
	it("keeps a value in range", () => {
		expect(clampMultiplier(3)).toBe(3);
	});

	it("pulls values back inside the range", () => {
		expect(clampMultiplier(0)).toBe(LEVEL_LIMITS.minMultiplier);
		expect(clampMultiplier(-4)).toBe(LEVEL_LIMITS.minMultiplier);
		expect(clampMultiplier(50)).toBe(LEVEL_LIMITS.maxMultiplier);
	});

	it("rounds a fraction", () => {
		expect(clampMultiplier(2.6)).toBe(3);
	});

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

	it("is one when the member holds no boost role", () => {
		expect(multiplierFor(boosted, ["999"])).toBe(1);
	});

	it("uses the matching role's multiplier", () => {
		expect(multiplierFor(boosted, [BOOSTER])).toBe(2);
	});

	/**
	 * Highest wins rather than the product: three stacked ×5 roles would be ×125, which is not what anyone setting up
	 * "×5 for boosters" is asking for.
	 */
	it("takes the best multiplier rather than multiplying them together", () => {
		expect(multiplierFor(boosted, [BOOSTER, VIP])).toBe(4);
	});

	it("is one when nothing is configured", () => {
		expect(multiplierFor(config(), [BOOSTER])).toBe(1);
	});
});

describe("earnsXp", () => {
	it("awards nothing while levelling is off", () => {
		expect(earnsXp(config({ enabled: false }), CHANNEL, [])).toBe(false);
	});

	it("awards XP in an ordinary channel", () => {
		expect(earnsXp(config(), CHANNEL, [BOOSTER])).toBe(true);
	});

	it("skips an ignored channel", () => {
		expect(earnsXp(config({ ignoredChannelIds: [CHANNEL] }), CHANNEL, [])).toBe(false);
	});

	it("skips a member holding an ignored role", () => {
		expect(earnsXp(config({ ignoredRoleIds: [MUTED] }), CHANNEL, [BOOSTER, MUTED])).toBe(false);
	});
});

describe("rewardChangeFor", () => {
	const rewards = [
		{ level: 5, roleId: BOOSTER },
		{ level: 10, roleId: VIP },
	];

	it("gives nothing when no reward has been reached", () => {
		expect(rewardChangeFor(config({ rewards }), 4, [])).toEqual({ add: [], remove: [] });
	});

	it("gives the reward for the level just reached", () => {
		expect(rewardChangeFor(config({ rewards }), 5, [])).toEqual({ add: [BOOSTER], remove: [] });
	});

	/** Someone who joins mid-way, or has a level set by an admin, is owed every tier. */
	it("catches up every earned reward at once", () => {
		expect(rewardChangeFor(config({ rewards }), 12, []).add).toEqual([BOOSTER, VIP]);
	});

	it("asks for nothing when the member already holds their rewards", () => {
		expect(rewardChangeFor(config({ rewards }), 12, [BOOSTER, VIP])).toEqual({ add: [], remove: [] });
	});

	it("keeps only the highest tier when rewards do not stack", () => {
		expect(rewardChangeFor(config({ rewards, stackRewards: false }), 12, [BOOSTER])).toEqual({
			add: [VIP],
			remove: [BOOSTER],
		});
	});

	it("removes nothing the member does not have", () => {
		expect(rewardChangeFor(config({ rewards, stackRewards: false }), 12, []).remove).toEqual([]);
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
	it("reports progress through the current level", () => {
		// Level 2 starts at 400 XP and level 3 at 900, so 650 is 250 of the 500 needed.
		expect(progressOf(650, 2)).toEqual({ level: 2, xp: 650, progress: 250, needed: 500, fraction: 0.5 });
	});

	it("starts a fresh member at zero", () => {
		expect(progressOf(0, 0).fraction).toBe(0);
	});

	/** An admin setting a level by hand leaves XP that does not match its floor. */
	it("clamps XP that sits outside the level's range", () => {
		expect(progressOf(0, 5).progress).toBe(0);
		expect(progressOf(999_999, 1).fraction).toBe(1);
	});
});

describe("withBoost", () => {
	it("adds a boost", () => {
		expect(withBoost([], BOOSTER, 3)).toEqual([{ roleId: BOOSTER, multiplier: 3 }]);
	});

	/** Two entries for one role would give the same question two answers. */
	it("replaces the multiplier of a role that is already boosting", () => {
		expect(withBoost([{ roleId: BOOSTER, multiplier: 2 }], BOOSTER, 5)).toEqual([{ roleId: BOOSTER, multiplier: 5 }]);
	});

	it("clamps the multiplier it is given", () => {
		expect(withBoost([], BOOSTER, 99)).toEqual([{ roleId: BOOSTER, multiplier: LEVEL_LIMITS.maxMultiplier }]);
	});

	it("refuses to grow past the limit", () => {
		const full = Array.from({ length: LEVEL_LIMITS.maxBoosts }, (_, index) => ({
			roleId: `role${index}`,
			multiplier: 2,
		}));

		expect(withBoost(full, "another", 2)).toBe(full);
	});
});

describe("nextMultiplier", () => {
	it("steps up", () => {
		expect(nextMultiplier(2)).toBe(3);
	});

	it("wraps round at the top, so one button covers the whole range", () => {
		expect(nextMultiplier(LEVEL_LIMITS.maxMultiplier)).toBe(LEVEL_LIMITS.minMultiplier);
	});
});

describe("withReward", () => {
	it("adds a reward and keeps the list sorted", () => {
		const rewards = withReward(withReward([], 10, VIP), 5, BOOSTER);
		expect(rewards.map((reward) => reward.level)).toEqual([5, 10]);
	});

	it("replaces the reward for a level that already has one", () => {
		expect(withReward([{ level: 5, roleId: BOOSTER }], 5, VIP)).toEqual([{ level: 5, roleId: VIP }]);
	});

	it("refuses to grow past the limit", () => {
		const full = Array.from({ length: LEVEL_LIMITS.maxRewards }, (_, index) => ({
			level: index + 1,
			roleId: `role${index}`,
		}));

		expect(withReward(full, 99, VIP)).toBe(full);
	});
});

describe("sortRewards", () => {
	it("does not mutate what it is given", () => {
		const rewards = [
			{ level: 9, roleId: VIP },
			{ level: 2, roleId: BOOSTER },
		];
		sortRewards(rewards);

		expect(rewards[0]?.level).toBe(9);
	});
});
