import { settingsOf, treasurePanel } from "@buttons/treasure";
import { TREASURE_DEFAULTS } from "@config/constants";

const CONFIGURED = {
	guildId: "g1",
	isEnabled: true,
	minMessages: 20,
	maxMessages: 60,
	minAmount: 25,
	maxAmount: 900,
	cooldownMs: 300_000,
	lastModifiedBy: "u1",
} as never;

describe("settingsOf", () => {
	/** An unconfigured guild still gets a full panel rather than a half-empty one. */
	it("falls back to the defaults when nothing is saved", () => {
		expect(settingsOf(null)).toEqual({
			enabled: false,
			configured: false,
			minMessages: TREASURE_DEFAULTS.minMessages,
			maxMessages: TREASURE_DEFAULTS.maxMessages,
			minAmount: TREASURE_DEFAULTS.minAmount,
			maxAmount: TREASURE_DEFAULTS.maxAmount,
			cooldownMs: TREASURE_DEFAULTS.cooldownMs,
		});
	});

	it("defaults to disabled, so drops never start without being asked for", () => {
		expect(settingsOf(null).enabled).toBe(false);
	});
});

describe("treasurePanel", () => {
	it("stays inside Discord's five-buttons-per-row limit", () => {
		for (const row of treasurePanel(settingsOf(CONFIGURED), true).components) {
			expect(row.components.length).toBeLessThanOrEqual(5);
		}
	});
});
