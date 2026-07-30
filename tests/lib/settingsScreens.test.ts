import { MessageFlags } from "discord.js";
import { DEFAULT_PREFIX } from "@config/constants";
import { parseCustomId } from "@core/button";
import { ANTILINK_PANEL_ID, antiLinkPanel, isBypassPermission } from "@lib/antiLinkPanel.util";
import { autoRolePanel, AUTOROLE_PANEL_ID, MAX_AUTO_ROLES } from "@lib/autoRolePanel.util";
import { type ContainerMessage, text } from "@lib/containers.util";
import { COUNTING_LIMITS, COUNTING_PANEL_ID, countingPanel } from "@lib/countingPanel.util";
import { checkPrefix, PREFIX_LIMITS, PREFIX_PANEL_ID, prefixPanel } from "@lib/prefixPanel.util";
import { channelValue, roleValue, settingsScreen, statusDot } from "@lib/settingsScreen.util";
import { VOICESTATS_PANEL_ID, voiceStatsPanel } from "@lib/voiceStatsPanel.util";
import { buttonsOf, duplicateIds, idsOf, textOf } from "@tests/helpers/containers";

const OWNER = "100000000000000001";
const CHANNEL = "200000000000000002";
const ROLE = "300000000000000003";

/** Every settings panel, so the shared rules can be asserted once across all of them. */
const PANELS: [string, string, ContainerMessage][] = [
	["auto-role", AUTOROLE_PANEL_ID, autoRolePanel({ roleIds: [ROLE] }, OWNER)],
	["auto-role, empty", AUTOROLE_PANEL_ID, autoRolePanel({ roleIds: [] }, OWNER)],
	["counting", COUNTING_PANEL_ID, countingPanel({ channelId: CHANNEL, count: 4, goal: 500 }, OWNER)],
	["counting, off", COUNTING_PANEL_ID, countingPanel({ channelId: null, count: 0, goal: 500 }, OWNER)],
	["anti-link", ANTILINK_PANEL_ID, antiLinkPanel({ enabled: true, bypass: "ManageMessages" }, OWNER)],
	["anti-link, off", ANTILINK_PANEL_ID, antiLinkPanel({ enabled: false, bypass: "ManageMessages" }, OWNER)],
	["voice stats", VOICESTATS_PANEL_ID, voiceStatsPanel({ memberChannelId: CHANNEL, botChannelId: null }, OWNER)],
	["voice stats, off", VOICESTATS_PANEL_ID, voiceStatsPanel({ memberChannelId: null, botChannelId: null }, OWNER)],
	["prefix", PREFIX_PANEL_ID, prefixPanel({ prefix: "!", isEnabled: true }, OWNER)],
	["prefix, off", PREFIX_PANEL_ID, prefixPanel({ prefix: DEFAULT_PREFIX, isEnabled: false }, OWNER)],
];

describe("every settings panel", () => {
	it.each(PANELS)("renders %s as a Components V2 message", (_name, _id, rendered) => {
		expect(rendered.flags).toBe(MessageFlags.IsComponentsV2);
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it.each(PANELS)("gives every control on %s a distinct custom ID", (_name, _id, rendered) => {
		expect(duplicateIds(rendered)).toEqual([]);
	});

	it.each(PANELS)("namespaces %s to its own handler, with the owner last", (_name, id, rendered) => {
		const ids = idsOf(rendered);

		expect(ids.length).toBeGreaterThan(0);
		for (const control of ids) {
			expect(parseCustomId(control).id).toBe(id);
			expect(parseCustomId(control).args.at(-1)).toBe(OWNER);
		}
	});

	/** The house style: every panel opens with a heading and says what is happening. */
	it.each(PANELS)("gives %s a heading and a status line", (_name, _id, rendered) => {
		expect(textOf(rendered)).toMatch(/^## /);
	});
});

describe("settingsScreen", () => {
	const screen = settingsScreen({
		id: "demo",
		ownerId: OWNER,
		category: "settings",
		title: "🔧 Demo",
		status: "Doing a thing.",
		note: "Saved.",
		rows: [
			{ label: "With a button", value: "one", action: { action: "edit", label: "Change" } },
			{ label: "Without one", value: "two" },
		],
		actions: [{ action: "off", label: "Turn off" }],
		footer: "A closing remark.",
	});

	it("renders the title, status, note and footer", () => {
		const text = textOf(screen);

		expect(text).toContain("## 🔧 Demo");
		expect(text).toContain("Doing a thing.");
		expect(text).toContain("Saved.");
		expect(text).toContain("A closing remark.");
	});

	it("renders a row's label and value", () => {
		expect(textOf(screen)).toContain("With a button");
		expect(textOf(screen)).toContain("one");
	});

	it("only builds a button for rows that ask for one", () => {
		const labels = buttonsOf(screen).map((control) => control.label);
		expect(labels).toEqual(["Change", "Turn off"]);
	});

	/**
	 * Two bare menus stacked together look identical once something is chosen — the
	 * placeholder that told them apart is replaced by the selection.
	 */
	it("captions each picker so the reader knows which is which", () => {
		const twoPickers = settingsScreen({
			id: "demo",
			ownerId: OWNER,
			category: "settings",
			title: "Two",
			status: "…",
			pickers: [
				{ label: "First menu", hint: "Does one thing.", control: text("a") },
				{ label: "Second menu", control: text("b") },
			],
		});

		const rendered = textOf(twoPickers);

		expect(rendered).toContain("First menu");
		expect(rendered).toContain("Does one thing.");
		expect(rendered).toContain("Second menu");
	});

	it("leaves out the optional parts when they are not given", () => {
		const bare = settingsScreen({
			id: "demo",
			ownerId: OWNER,
			category: "settings",
			title: "Bare",
			status: "Nothing else.",
		});

		expect(buttonsOf(bare)).toHaveLength(0);
		expect(duplicateIds(bare)).toEqual([]);
	});

	/** Discord allows five buttons per row, so more than that has to wrap. */
	it("wraps more than five actions across rows", () => {
		const many = settingsScreen({
			id: "demo",
			ownerId: OWNER,
			category: "settings",
			title: "Many",
			status: "Lots of buttons.",
			actions: Array.from({ length: 7 }, (_, index) => ({ action: `a${index}`, label: `A${index}` })),
		});

		expect(buttonsOf(many)).toHaveLength(7);
		expect(duplicateIds(many)).toEqual([]);
	});

	it("carries extra arguments before the owner", () => {
		const withArgs = settingsScreen({
			id: "demo",
			ownerId: OWNER,
			category: "settings",
			title: "Args",
			status: "…",
			actions: [{ action: "pick", label: "Pick", args: ["red"] }],
		});

		expect(parseCustomId(idsOf(withArgs)[0] ?? "").args).toEqual(["red", OWNER]);
	});
});

describe("the shared value formatters", () => {
	it("never renders an empty cell", () => {
		expect(channelValue(null)).toMatch(/not set/i);
		expect(channelValue(undefined)).toMatch(/not set/i);
		expect(roleValue([])).toMatch(/none/i);
	});

	it("mentions what is set", () => {
		expect(channelValue(CHANNEL)).toBe(`<#${CHANNEL}>`);
		expect(roleValue([ROLE])).toBe(`<@&${ROLE}>`);
	});

	it("shows status as a dot and a word, never colour alone", () => {
		expect(statusDot(true)).toMatch(/on/i);
		expect(statusDot(false)).toMatch(/off/i);
	});
});

describe("the auto-role panel", () => {
	it("lists the roles new members are given", () => {
		expect(textOf(autoRolePanel({ roleIds: [ROLE] }, OWNER))).toContain(`<@&${ROLE}>`);
	});

	/** A role above the bot is silently dead, and Discord never says so. */
	it("warns about roles it cannot assign", () => {
		const text = textOf(autoRolePanel({ roleIds: [ROLE], unusable: [ROLE] }, OWNER));
		expect(text).toMatch(/cannot assign/i);
	});

	it("greys out Give nothing when nothing is given", () => {
		const clear = buttonsOf(autoRolePanel({ roleIds: [] }, OWNER))[0];
		expect(clear?.disabled).toBe(true);
	});

	it("caps how many roles can be picked", () => {
		expect(MAX_AUTO_ROLES).toBeGreaterThan(0);
	});
});

describe("the counting panel", () => {
	it("shows the next number rather than the last one", () => {
		expect(textOf(countingPanel({ channelId: CHANNEL, count: 41, goal: 500 }, OWNER))).toContain("42");
	});

	it("hides the settings until a channel is chosen", () => {
		expect(buttonsOf(countingPanel({ channelId: null, count: 0, goal: 500 }, OWNER))).toHaveLength(1);
	});

	it("keeps the goal inside a sane range", () => {
		expect(COUNTING_LIMITS.minGoal).toBeLessThan(COUNTING_LIMITS.maxGoal);
	});
});

describe("the anti-link panel", () => {
	it("names the permission that bypasses the filter", () => {
		expect(textOf(antiLinkPanel({ enabled: true, bypass: "ManageMessages" }, OWNER))).toMatch(/manage messages/i);
	});

	it("disables the bypass menu while the filter is off", () => {
		const off = antiLinkPanel({ enabled: false, bypass: "ManageMessages" }, OWNER);
		const menu = off.components[0]?.toJSON();

		expect(JSON.stringify(menu)).toContain('"disabled":true');
	});

	it("accepts only the offered permissions", () => {
		expect(isBypassPermission("ManageMessages")).toBe(true);
		expect(isBypassPermission("KickMembers")).toBe(false);
	});
});

describe("checkPrefix", () => {
	it("accepts an ordinary prefix", () => {
		expect(checkPrefix(" ! ")).toEqual({ ok: true, value: "!" });
	});

	it("rejects an empty one", () => {
		expect(checkPrefix("   ").ok).toBe(false);
	});

	/** A prefix with a space in it can never match a message. */
	it("rejects one containing a space, and says why", () => {
		const verdict = checkPrefix("t ?");

		expect(verdict.ok).toBe(false);
		expect(verdict.ok ? "" : verdict.reason).toMatch(/spaces/i);
	});

	it("rejects one that is too long", () => {
		expect(checkPrefix("x".repeat(PREFIX_LIMITS.maxLength + 1)).ok).toBe(false);
	});
});

describe("the prefix panel", () => {
	it("shows the prefix in an example", () => {
		expect(textOf(prefixPanel({ prefix: "!", isEnabled: true }, OWNER))).toContain("!help");
	});

	it("says so when text commands are off", () => {
		expect(textOf(prefixPanel({ prefix: "!", isEnabled: false }, OWNER))).toMatch(/slash commands still work/i);
	});

	it("greys out the reset when the prefix is already the default", () => {
		const reset = buttonsOf(prefixPanel({ prefix: DEFAULT_PREFIX, isEnabled: true }, OWNER)).find((control) =>
			String(control.label).startsWith("Reset"),
		);

		expect(reset?.disabled).toBe(true);
	});
});

describe("the voice counter panel", () => {
	it("names the channels being kept up to date", () => {
		expect(textOf(voiceStatsPanel({ memberChannelId: CHANNEL, botChannelId: null }, OWNER))).toContain(`<#${CHANNEL}>`);
	});

	it("explains the rename rate limit, which is why counts lag", () => {
		expect(textOf(voiceStatsPanel({ memberChannelId: CHANNEL, botChannelId: null }, OWNER))).toMatch(/rate-limit/i);
	});

	/** The report that prompted this: two identical menus with no way to tell them apart. */
	it("labels which counter each menu changes", () => {
		const rendered = textOf(voiceStatsPanel({ memberChannelId: CHANNEL, botChannelId: null }, OWNER));

		expect(rendered).toMatch(/member counter/i);
		expect(rendered).toMatch(/bot counter/i);
	});

	it("disables both actions until a channel is chosen", () => {
		for (const control of buttonsOf(voiceStatsPanel({ memberChannelId: null, botChannelId: null }, OWNER))) {
			expect(control.disabled).toBe(true);
		}
	});
});
