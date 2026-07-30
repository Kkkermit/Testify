import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { DEFAULT_LEVEL_CONFIG, LEVEL_LIMITS, type LevelConfig } from "@lib/levelling.util";
import {
	isLevelTab,
	LEVEL_PANEL_ID,
	LEVEL_TABS,
	levelPanel,
	type LevelPanelState,
	type LevelTab,
} from "@lib/levelPanel.util";
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

function labelsOf(rendered: ReturnType<typeof levelPanel>): string[] {
	return buttonsOf(rendered).map((control) => (typeof control.label === "string" ? control.label : ""));
}

describe("isLevelTab", () => {
	it("accepts the real tabs and nothing else", () => {
		for (const tab of LEVEL_TABS) expect(isLevelTab(tab)).toBe(true);
		expect(isLevelTab("music")).toBe(false);
	});
});

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

	/**
	 * The tab is the first argument of every control, which is how a press knows
	 * which screen to redraw without anything being remembered between presses.
	 */
	it.each(LEVEL_TABS)("carries the %s tab in the controls it draws", (tab) => {
		const ids = idsOf(panel(tab)).map((id) => parseCustomId(id));
		const controls = ids.filter((id) => id.action !== "tab");

		expect(controls.length).toBeGreaterThan(0);
		for (const control of controls) expect(control.args[0]).toBe(tab);
	});

	it("offers every tab, greying out the one already open", () => {
		const rendered = panel("boosts");
		const tabs = buttonsOf(rendered).filter((control) => parseCustomId(String(control.custom_id)).action === "tab");

		expect(tabs).toHaveLength(LEVEL_TABS.length);
		expect(tabs.filter((control) => control.disabled === true)).toHaveLength(1);
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

	it("shows a note from the last press when there is one", () => {
		expect(textOf(panel("overview", {}, "Levelling is on."))).toContain("Levelling is on.");
	});

	describe("the overview tab", () => {
		it("offers to turn levelling on when it is off", () => {
			expect(labelsOf(panel("overview", { enabled: false }))).toContain("Turn on");
		});

		it("offers to turn it off when it is on", () => {
			expect(labelsOf(panel("overview"))).toContain("Turn off");
		});

		/** Nothing else on this tab does anything while levelling is off. */
		it("disables the announcement controls until levelling is on", () => {
			const off = panel("overview", { enabled: false });
			const announce = buttonsOf(off).find((control) => parseCustomId(String(control.custom_id)).action === "announce");

			expect(announce?.disabled).toBe(true);
			expect(selectsOf(off)[0]?.disabled).toBe(true);
		});

		it("says where level-ups are announced", () => {
			expect(textOf(panel("overview", { levelUpChannelId: CHANNEL }))).toContain(CHANNEL);
		});

		it("says so when announcements are silenced", () => {
			expect(textOf(panel("overview", { announce: false }))).toMatch(/announcements are off/i);
		});

		/** Announcing in the current channel is already the default, so there is nothing to switch to. */
		it("greys out Announce in chat when that is already what happens", () => {
			const rendered = panel("overview", { levelUpChannelId: null });
			expect(buttonsOf(rendered).find((control) => control.label === "Announce in chat")?.disabled).toBe(true);
		});

		it("greys out Reset when there is nothing configured to reset", () => {
			const rendered = panel("overview", { enabled: false });
			expect(buttonsOf(rendered).find((control) => control.label === "Reset everything")?.disabled).toBe(true);
		});
	});

	describe("the boosts tab", () => {
		const boosted = panel("boosts", {
			boosts: [
				{ roleId: BOOSTER, multiplier: 2 },
				{ roleId: VIP, multiplier: 4 },
			],
		});

		it("explains what to do when nothing is configured", () => {
			expect(textOf(panel("boosts"))).toMatch(/earn XP faster/i);
		});

		/** Highest wins, and the panel has to say so or a guild will expect ×10. */
		it("says several boost roles do not multiply together", () => {
			expect(textOf(panel("boosts"))).toMatch(/best one/i);
		});

		it("lists each boost role with its multiplier", () => {
			const text = textOf(boosted);

			expect(text).toContain(`<@&${BOOSTER}>`);
			expect(text).toContain("×2");
			expect(text).toContain("×4");
		});

		/**
		 * The button sits in a section beside its own role. A row of buttons under the
		 * list would leave the reader counting to work out which is which.
		 */
		it("gives each boost role its own multiplier button", () => {
			const cycles = buttonsOf(boosted).filter(
				(control) => parseCustomId(String(control.custom_id)).action === "cycle",
			);

			expect(cycles).toHaveLength(2);
			expect(cycles.map((control) => parseCustomId(String(control.custom_id)).args[1])).toEqual([BOOSTER, VIP]);
		});

		it("pre-ticks the roles that are already boosting, so deselecting removes them", () => {
			const menu = selectsOf(boosted).find((select) => select.type === 6);
			const ticked = (menu?.default_values as { id: string }[] | undefined)?.map((value) => value.id);

			expect(ticked).toEqual([BOOSTER, VIP]);
		});

		it("lets the selection be emptied", () => {
			expect(selectsOf(boosted).find((select) => select.type === 6)?.min_values).toBe(0);
		});

		it("caps how many roles can be picked", () => {
			expect(selectsOf(boosted).find((select) => select.type === 6)?.max_values).toBe(LEVEL_LIMITS.maxBoosts);
		});
	});

	describe("the rewards tab", () => {
		const withRewards = panel("rewards", {
			rewards: [
				{ level: 5, roleId: BOOSTER },
				{ level: 20, roleId: VIP },
			],
		});

		it("lists each reward with the level that earns it", () => {
			const text = textOf(withRewards);

			expect(text).toContain("Level 5");
			expect(text).toContain(`<@&${VIP}>`);
		});

		it("gives each reward its own Remove button, keyed by level", () => {
			const removes = buttonsOf(withRewards).filter(
				(control) => parseCustomId(String(control.custom_id)).action === "unreward",
			);

			expect(removes.map((control) => parseCustomId(String(control.custom_id)).args[1])).toEqual(["5", "20"]);
		});

		it("says whether rewards stack", () => {
			expect(textOf(panel("rewards", { rewards: [{ level: 5, roleId: VIP }], stackRewards: true }))).toMatch(
				/keep every reward/i,
			);
			expect(textOf(panel("rewards", { rewards: [{ level: 5, roleId: VIP }], stackRewards: false }))).toMatch(
				/only their highest/i,
			);
		});

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

	describe("the ignored tab", () => {
		it("says when nothing is ignored", () => {
			const text = textOf(panel("ignores"));

			expect(text).toMatch(/Ignored channels/i);
			expect(text).toMatch(/Ignored roles/i);
			expect(text).toMatch(/every channel earns XP/i);
			expect(text).toMatch(/every member earns XP/i);
		});

		it("lists ignored channels and roles", () => {
			const text = textOf(panel("ignores", { ignoredChannelIds: [CHANNEL], ignoredRoleIds: [BOOSTER] }));

			expect(text).toContain(`<#${CHANNEL}>`);
			expect(text).toContain(`<@&${BOOSTER}>`);
		});

		it("pre-ticks both menus with what is already ignored", () => {
			const rendered = panel("ignores", { ignoredChannelIds: [CHANNEL], ignoredRoleIds: [BOOSTER] });
			const ticked = selectsOf(rendered).map((select) =>
				(select.default_values as { id: string }[] | undefined)?.map((value) => value.id),
			);

			expect(ticked).toEqual([[CHANNEL], [BOOSTER]]);
		});

		it("lets both selections be emptied", () => {
			for (const select of selectsOf(panel("ignores"))) expect(select.min_values).toBe(0);
		});
	});
});
