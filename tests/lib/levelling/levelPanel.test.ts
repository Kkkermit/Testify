import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { LEVEL_PANEL_ID, LEVEL_TABS } from "@lib/levelling/levelling.constants";
import { type LevelConfig, type LevelPanelState, type LevelTab } from "@lib/levelling/levelling.types";
import { DEFAULT_LEVEL_CONFIG, LEVEL_LIMITS } from "@lib/levelling/levelling.util";
import { levelPanel } from "@lib/levelling/levelPanel.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const CHANNEL = "200000000000000002";
const BOOSTER = "300000000000000003";
const VIP = "300000000000000004";

function config(overrides: Partial<LevelConfig> = {}): LevelConfig {
	return { ...DEFAULT_LEVEL_CONFIG, enabled: true, ...overrides };
}

function panel(tab: LevelTab, overrides: Partial<LevelConfig> = {}, note?: string): ReturnType<typeof levelPanel> {
	const state: LevelPanelState = { tab, config: config(overrides), ...(note !== undefined ? { note } : {}) };
	return levelPanel(state, OWNER);
}

/** Every select menu in the container, whatever its type. */
function selectsOf(rendered: ReturnType<typeof levelPanel>): Record<string, unknown>[] {
	const found: Record<string, unknown>[] = [];

	const walk = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const record = node as Record<string, unknown>;

		if (typeof record.type === "number" && record.type >= 3 && record.type <= 8) found.push(record);
		for (const value of Object.values(record)) {
			if (Array.isArray(value)) value.forEach(walk);
			else if (typeof value === "object") walk(value);
		}
	};

	rendered.components.forEach((component) => walk(component.toJSON()));
	return found;
}

describe("the levelling panel", () => {
	it.each(LEVEL_TABS)("renders the %s tab as a Components V2 message", (tab) => {
		expect(panel(tab).flags).toBe(MessageFlags.IsComponentsV2);
	});

	it.each(LEVEL_TABS)("namespaces every control on the %s tab, with the owner last", (tab) => {
		const rendered = panel(tab, { boosts: [{ roleId: BOOSTER, multiplier: 2 }], rewards: [{ level: 5, roleId: VIP }] });

		for (const id of idsOf(rendered)) {
			expect(parseCustomId(id).id).toBe(LEVEL_PANEL_ID);
			expect(parseCustomId(id).args.at(-1)).toBe(OWNER);
		}
	});

	/** Every control carries its tab as the first argument. */
	it.each(LEVEL_TABS)("carries the %s tab in the controls it draws", (tab) => {
		const ids = idsOf(panel(tab)).map((id) => parseCustomId(id));
		const controls = ids.filter((id) => id.action !== "tab");

		expect(controls.length).toBeGreaterThan(0);
		for (const control of controls) expect(control.args[0]).toBe(tab);
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it.each(LEVEL_TABS)("gives every control on the %s tab a distinct custom ID", (tab) => {
		const filled = {
			boosts: Array.from({ length: LEVEL_LIMITS.maxBoosts }, (_, index) => ({
				roleId: `role${index}`,
				multiplier: 2,
			})),
			rewards: Array.from({ length: LEVEL_LIMITS.maxRewards }, (_, index) => ({
				level: index + 1,
				roleId: `reward${index}`,
			})),
			ignoredChannelIds: [CHANNEL],
			ignoredRoleIds: [BOOSTER],
		};

		expect(duplicateIds(panel(tab))).toEqual([]);
		expect(duplicateIds(panel(tab, filled))).toEqual([]);
	});

	/** Two levels pointing at one role is legal, and must not collide on the role ID. */
	it("keeps reward controls distinct when two levels share a role", () => {
		const shared = [
			{ level: 5, roleId: VIP },
			{ level: 10, roleId: VIP },
		];

		expect(duplicateIds(panel("rewards", { rewards: shared }))).toEqual([]);
	});

	describe("the overview tab", () => {
		/** Nothing else on this tab does anything while levelling is off. */
		it("disables the announcement controls until levelling is on", () => {
			const off = panel("overview", { enabled: false });
			const announce = buttonsOf(off).find((control) => parseCustomId(String(control.custom_id)).action === "announce");

			expect(announce?.disabled).toBe(true);
			expect(selectsOf(off)[0]?.disabled).toBe(true);
		});

		/** Announcing in the current channel is already the default, so there is nothing to switch to. */
		it("greys out Announce in chat when that is already what happens", () => {
			const rendered = panel("overview", { levelUpChannelId: null });
			expect(buttonsOf(rendered).find((control) => control.label === "Announce in chat")?.disabled).toBe(true);
		});
	});

	describe("the boosts tab", () => {
		const boosted = panel("boosts", {
			boosts: [
				{ roleId: BOOSTER, multiplier: 2 },
				{ roleId: VIP, multiplier: 4 },
			],
		});

		/** Highest wins, and the panel has to say so or a guild will expect ×10. */
		it("says several boost roles do not multiply together", () => {
			expect(textOf(panel("boosts"))).toMatch(/best one/i);
		});

		/** The button sits in a section beside its own role. */
		it("gives each boost role its own multiplier button", () => {
			const cycles = buttonsOf(boosted).filter(
				(control) => parseCustomId(String(control.custom_id)).action === "cycle",
			);

			expect(cycles).toHaveLength(2);
			expect(cycles.map((control) => parseCustomId(String(control.custom_id)).args[1])).toEqual([BOOSTER, VIP]);
		});
	});

	describe("the rewards tab", () => {
		/** Stacking is meaningless with nothing to stack. */
		it("greys out the stacking toggle until a reward exists", () => {
			const rendered = panel("rewards");
			const stack = buttonsOf(rendered).find((control) => parseCustomId(String(control.custom_id)).action === "stack");

			expect(stack?.disabled).toBe(true);
		});

		it("stops offering new rewards once the limit is reached", () => {
			const full = Array.from({ length: LEVEL_LIMITS.maxRewards }, (_, index) => ({
				level: index + 1,
				roleId: `role${index}`,
			}));

			const menu = selectsOf(panel("rewards", { rewards: full })).find((select) => select.type === 6);
			expect(menu?.disabled).toBe(true);
		});
	});
});
