import { MessageFlags } from "discord.js";
import { parseCustomId } from "@core/button";
import { text } from "@lib/discord/containers.util";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { antiLinkPanel, isBypassPermission } from "@lib/moderation/antiLinkPanel.util";
import { ANTILINK_PANEL_ID } from "@lib/moderation/moderation.constants";
import { autoRolePanel } from "@lib/settings/autoRolePanel.util";
import { countingPanel } from "@lib/settings/countingPanel.util";
import { checkPrefix, prefixPanel } from "@lib/settings/prefixPanel.util";
import {
	AUTOROLE_PANEL_ID,
	COUNTING_PANEL_ID,
	PREFIX_LIMITS,
	PREFIX_PANEL_ID,
	VOICESTATS_PANEL_ID,
} from "@lib/settings/settings.constants";
import { channelValue, roleValue, settingsScreen, statusDot } from "@lib/settings/settingsScreen.util";
import { voiceStatsPanel } from "@lib/settings/voiceStatsPanel.util";
import { DEFAULT_PREFIX, SETTINGS_LIMITS } from "@testify/shared";
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

/** The names of the panels that break a rule, so a failure says which. */
const breaking = (rule: (id: string, rendered: ContainerMessage) => boolean): string[] =>
	PANELS.filter(([, id, rendered]) => !rule(id, rendered)).map(([name]) => name);

describe("every settings panel", () => {
	it("is a Components V2 message", () => {
		expect(breaking((_id, rendered) => rendered.flags === MessageFlags.IsComponentsV2)).toEqual([]);
	});

	/** Discord rejects the whole message when two components share a custom ID. */
	it("gives every control a distinct custom ID", () => {
		expect(breaking((_id, rendered) => duplicateIds(rendered).length === 0)).toEqual([]);
	});

	it("namespaces every control to its own handler, with the owner last", () => {
		const own = (id: string, rendered: ContainerMessage): boolean => {
			const ids = idsOf(rendered);
			return (
				ids.length > 0 &&
				ids.every((control) => parseCustomId(control).id === id && parseCustomId(control).args.at(-1) === OWNER)
			);
		};

		expect(breaking(own)).toEqual([]);
	});

	/** The house style: every panel opens with a heading and says what is happening. */
	it("opens with a heading and a status line", () => {
		expect(breaking((_id, rendered) => textOf(rendered).startsWith("## "))).toEqual([]);
	});
});

describe("settingsScreen", () => {
	/** Each picker is captioned, since two chosen menus look identical. */
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
});

describe("the shared value formatters", () => {
	it("mentions what is set, and never renders an empty cell", () => {
		expect(channelValue(null)).toMatch(/not set/i);
		expect(channelValue(undefined)).toMatch(/not set/i);
		expect(roleValue([])).toMatch(/none/i);
		expect(channelValue(CHANNEL)).toBe(`<#${CHANNEL}>`);
		expect(roleValue([ROLE])).toBe(`<@&${ROLE}>`);
	});

	it("shows status as a dot and a word, never colour alone", () => {
		expect(statusDot(true)).toMatch(/on/i);
		expect(statusDot(false)).toMatch(/off/i);
	});
});

describe("the auto-role panel", () => {
	/** A role above the bot is silently dead, and Discord never says so. */
	it("warns about roles it cannot assign", () => {
		const text = textOf(autoRolePanel({ roleIds: [ROLE], unusable: [ROLE] }, OWNER));
		expect(text).toMatch(/cannot assign/i);
	});
});

describe("the counting panel", () => {
	it("shows the next number rather than the last one", () => {
		expect(textOf(countingPanel({ channelId: CHANNEL, count: 41, goal: 500 }, OWNER))).toContain("42");
	});
});

describe("the anti-link panel", () => {
	it("names the permission that bypasses the filter", () => {
		expect(textOf(antiLinkPanel({ enabled: true, bypass: "ManageMessages" }, OWNER))).toMatch(/manage messages/i);
	});

	it("accepts only the offered permissions", () => {
		expect(isBypassPermission("ManageMessages")).toBe(true);
		expect(isBypassPermission("KickMembers")).toBe(false);
	});
});

describe("checkPrefix", () => {
	/** A prefix with a space in it can never match a message, and one of only whitespace would match every one. */
	it("refuses an empty one and one containing a space, and says why", () => {
		const verdict = checkPrefix("t ?");

		expect(checkPrefix("   ").ok).toBe(false);
		expect(verdict.ok).toBe(false);
		expect(verdict.ok ? "" : verdict.reason).toMatch(/spaces/i);
	});

	/** The panel stopped at five while the dashboard took eight, so its form refused to open on a longer prefix. */
	it("takes exactly as long a prefix as the dashboard does", () => {
		expect(checkPrefix("x".repeat(SETTINGS_LIMITS.maxPrefix)).ok).toBe(true);
		expect(checkPrefix("x".repeat(SETTINGS_LIMITS.maxPrefix + 1)).ok).toBe(false);
		expect(PREFIX_LIMITS.maxLength).toBe(SETTINGS_LIMITS.maxPrefix);
	});
});

describe("the voice counter panel", () => {
	it("labels which counter each menu changes, and explains the rename rate limit that makes counts lag", () => {
		const rendered = textOf(voiceStatsPanel({ memberChannelId: CHANNEL, botChannelId: null }, OWNER));

		expect(rendered).toMatch(/rate-limit/i);
		expect(rendered).toMatch(/member counter/i);
		expect(rendered).toMatch(/bot counter/i);
	});

	it("disables both actions until a channel is chosen", () => {
		for (const control of buttonsOf(voiceStatsPanel({ memberChannelId: null, botChannelId: null }, OWNER))) {
			expect(control.disabled).toBe(true);
		}
	});
});
