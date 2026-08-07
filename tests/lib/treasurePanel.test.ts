import { settingsOf, TREASURE_PANEL_ID, treasurePanel } from "@buttons/treasure";
import { TREASURE_DEFAULTS } from "@config/constants";
import { parseCustomId } from "@core/button";

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

function actionsOf(rendered: ReturnType<typeof treasurePanel>): string[] {
	return rendered.components.flatMap((row) =>
		row.components.map((component) => parseCustomId((component.toJSON() as { custom_id: string }).custom_id).action),
	);
}

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

	it("uses the saved values when there are some", () => {
		expect(settingsOf(CONFIGURED)).toMatchObject({ minMessages: 20, maxAmount: 900, enabled: true });
	});

	it("defaults to disabled, so drops never start without being asked for", () => {
		expect(settingsOf(null).enabled).toBe(false);
	});
});

describe("treasurePanel", () => {
	it("shows all four settings at once, which eleven slash options did not", () => {
		const fields = treasurePanel(settingsOf(CONFIGURED), true).embeds[0]?.toJSON().fields;

		expect(fields?.map((field) => field.name)).toEqual(["Status", "Messages between drops", "Drop size", "Cooldown"]);
	});

	it("shows the current value beside each setting", () => {
		const rendered = JSON.stringify(treasurePanel(settingsOf(CONFIGURED), true).embeds[0]?.toJSON());

		expect(rendered).toContain("20–60");
		expect(rendered).toContain("900");
	});

	it("offers a button for every editable field", () => {
		expect(actionsOf(treasurePanel(settingsOf(CONFIGURED), true))).toEqual([
			"toggle",
			"edit-messages",
			"edit-amount",
			"edit-cooldown",
			"reset",
		]);
	});

	it("namespaces every button to the treasure handler", () => {
		const ids = treasurePanel(settingsOf(CONFIGURED), true).components.flatMap((row) =>
			row.components.map((component) => (component.toJSON() as { custom_id: string }).custom_id),
		);

		for (const id of ids) expect(parseCustomId(id).id).toBe(TREASURE_PANEL_ID);
	});

	it("flips the toggle label with the current state", () => {
		const on = treasurePanel(settingsOf(CONFIGURED), true).components[0]?.components[0]?.toJSON() as {
			label?: string;
		};
		const off = treasurePanel(
			{ ...settingsOf(CONFIGURED), enabled: false },
			true,
		).components[0]?.components[0]?.toJSON() as {
			label?: string;
		};

		expect(on.label).toBe("Turn off");
		expect(off.label).toBe("Turn on");
	});

	it("tells an unconfigured guild what it is looking at", () => {
		const description = treasurePanel(settingsOf(null), false).embeds[0]?.toJSON().description;
		expect(description).toContain("Not set up yet");
	});

	it("stays inside Discord's five-buttons-per-row limit", () => {
		for (const row of treasurePanel(settingsOf(CONFIGURED), true).components) {
			expect(row.components.length).toBeLessThanOrEqual(5);
		}
	});
});
