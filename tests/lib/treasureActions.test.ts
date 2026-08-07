import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { applyTreasure, normaliseTreasure, readTreasure, resetTreasure } from "@lib/treasureActions.util";
import { TREASURE_DEFAULTS } from "@testify/shared";

jest.mock("@database/repositories/settingsRepository", () => ({
	getTreasureConfig: jest.fn(() => Promise.resolve(null)),
	saveTreasureConfig: jest.fn(() => Promise.resolve({})),
}));

const GUILD = "900000000000000001";
const ACTOR = "100000000000000001";

const stored = jest.mocked(getTreasureConfig);
const saved = jest.mocked(saveTreasureConfig);

function configured(overrides: Record<string, unknown> = {}): void {
	stored.mockResolvedValue({
		guildId: GUILD,
		isEnabled: true,
		minMessages: 20,
		maxMessages: 60,
		minAmount: 50,
		maxAmount: 900,
		cooldownMs: 600_000,
		createdBy: ACTOR,
		lastModifiedBy: ACTOR,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	stored.mockResolvedValue(null);
});

describe("normaliseTreasure", () => {
	/** An unconfigured guild still renders a full page rather than a half-empty one. */
	it("falls back to the defaults when nothing is saved", () => {
		expect(normaliseTreasure(null)).toEqual({ ...TREASURE_DEFAULTS, enabled: false, configured: false });
	});

	it("defaults to off, so drops never start without being asked for", () => {
		expect(normaliseTreasure(null).enabled).toBe(false);
	});

	it("says a record exists so the page can stop calling the numbers defaults", () => {
		expect(normaliseTreasure({ isEnabled: true } as never).configured).toBe(true);
	});
});

describe("readTreasure", () => {
	it("reads through the repository rather than the model", async () => {
		configured();

		await expect(readTreasure(GUILD)).resolves.toMatchObject({ minMessages: 20, maxAmount: 900, enabled: true });
	});
});

describe("applyTreasure", () => {
	it("keeps the fields the patch did not mention", async () => {
		configured();

		await applyTreasure(GUILD, { minAmount: 75 }, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ minAmount: 75, maxAmount: 900 }));
	});

	/**
	 * A patch can carry one half of a pair, so the refusal has to run against the merged record — checking the
	 * patch alone would store a floor above its own ceiling.
	 */
	it("refuses a half-pair that makes the merged range impossible", async () => {
		configured();

		const result = await applyTreasure(GUILD, { minMessages: 90 }, ACTOR);

		expect(result).toEqual({ problem: expect.stringMatching(/fewest messages/i) });
		expect(saved).not.toHaveBeenCalled();
	});

	it("takes both halves at once when they are consistent", async () => {
		configured();

		const result = await applyTreasure(GUILD, { minMessages: 90, maxMessages: 120 }, ACTOR);

		expect("settings" in result).toBe(true);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ minMessages: 90, maxMessages: 120 }));
	});

	it("records who made the change", async () => {
		configured();

		await applyTreasure(GUILD, { enabled: false }, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ lastModifiedBy: ACTOR, isEnabled: false }));
	});

	/** The answer is what the page renders next, so it has to say the record now exists. */
	it("answers as configured even when there was no record before", async () => {
		const result = await applyTreasure(GUILD, { enabled: true }, ACTOR);

		expect(result).toEqual({ settings: expect.objectContaining({ configured: true, enabled: true }) });
	});
});

describe("resetTreasure", () => {
	it("puts every number back to its default", async () => {
		configured();

		await resetTreasure(GUILD, ACTOR);

		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining(TREASURE_DEFAULTS));
	});

	/** Turning drops off is a separate decision from the numbers behind them. */
	it("leaves the switch where it was", async () => {
		configured({ isEnabled: true });
		await resetTreasure(GUILD, ACTOR);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isEnabled: true }));

		jest.clearAllMocks();
		configured({ isEnabled: false });
		await resetTreasure(GUILD, ACTOR);
		expect(saved).toHaveBeenCalledWith(GUILD, expect.objectContaining({ isEnabled: false }));
	});
});
