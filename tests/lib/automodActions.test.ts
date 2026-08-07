import {
	AutoModerationActionType,
	AutoModerationRuleTriggerType,
	Collection,
	type Guild,
	PermissionFlagsBits,
} from "discord.js";
import { canManageAutomod, createAutomodRule, listAutomodRules, toRuleSummary } from "@lib/automodActions.util";

const BOT = "100000000000000001";

function guildWith(create = jest.fn()): Guild {
	return {
		autoModerationRules: { create },
		members: { me: { permissions: { has: () => true } } },
	} as unknown as Guild;
}

/** Both surfaces call this, so a rule created from Discord and one from the web have to be the same rule. */
describe("createAutomodRule", () => {
	it.each([
		["flagged-words", AutoModerationRuleTriggerType.KeywordPreset],
		["spam", AutoModerationRuleTriggerType.Spam],
	] as const)("builds %s with the right trigger", async (preset, trigger) => {
		const create = jest.fn().mockResolvedValue({ name: "x" });
		await createAutomodRule(guildWith(create), { preset }, "why");

		expect(create).toHaveBeenCalledWith(expect.objectContaining({ triggerType: trigger, enabled: true }));
	});

	it("carries the mention limit into the trigger metadata", async () => {
		const create = jest.fn().mockResolvedValue({ name: "x" });
		await createAutomodRule(guildWith(create), { preset: "mention-spam", limit: 7 }, "why");

		expect(create).toHaveBeenCalledWith(expect.objectContaining({ triggerMetadata: { mentionTotalLimit: 7 } }));
	});

	/** The word is what the rule is for, so it has to reach Discord and name the rule people will read. */
	it("puts the keyword in both the filter and the name", async () => {
		const create = jest.fn().mockResolvedValue({ name: "x" });
		await createAutomodRule(guildWith(create), { preset: "keyword", word: "badword" }, "why");

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Blocked: badword",
				triggerMetadata: { keywordFilter: ["badword"] },
			}),
		);
	});

	it("always blocks the message rather than only alerting", async () => {
		const create = jest.fn().mockResolvedValue({ name: "x" });
		await createAutomodRule(guildWith(create), { preset: "spam" }, "why");

		const [[sent]] = create.mock.calls as [[{ actions: { type: number }[] }]];
		expect(sent.actions[0]?.type).toBe(AutoModerationActionType.BlockMessage);
	});

	it("passes the reason through to the audit log Discord keeps", async () => {
		const create = jest.fn().mockResolvedValue({ name: "x" });
		await createAutomodRule(guildWith(create), { preset: "spam" }, "Created by kate");

		expect(create).toHaveBeenCalledWith(expect.objectContaining({ reason: "Created by kate" }));
	});
});

describe("toRuleSummary", () => {
	const rule = {
		id: "1",
		name: "Block spam",
		enabled: true,
		triggerType: AutoModerationRuleTriggerType.Spam,
		creatorId: BOT,
		actions: [{ type: AutoModerationActionType.BlockMessage }],
	};

	it("names the trigger in words rather than a number", () => {
		expect(toRuleSummary(rule as never, BOT).trigger).toBe("Spam");
	});

	/** A rule somebody made in Discord's own UI must not look like one Testify is responsible for. */
	it("marks only the rules the bot itself created", () => {
		expect(toRuleSummary(rule as never, BOT).fromTestify).toBe(true);
		expect(toRuleSummary(rule as never, "200000000000000002").fromTestify).toBe(false);
	});

	/** Discord has trigger types Testify does not build; the list still has to render them. */
	it("falls back rather than dropping a trigger it does not know", () => {
		const summary = toRuleSummary({ ...rule, triggerType: 99 } as never, BOT);

		expect(summary.preset).toBeNull();
		expect(summary.trigger).toBe("Something else");
	});

	it("collapses repeated actions to one of each", () => {
		const actions = [
			{ type: AutoModerationActionType.BlockMessage },
			{ type: AutoModerationActionType.BlockMessage },
			{ type: AutoModerationActionType.Timeout },
		];

		expect(toRuleSummary({ ...rule, actions } as never, BOT).actions).toEqual(["block", "timeout"]);
	});
});

describe("listAutomodRules", () => {
	function guildHolding(...rules: { id: string; name: string }[]): Guild {
		const docs = rules.map((rule) => ({
			enabled: true,
			triggerType: AutoModerationRuleTriggerType.Spam,
			creatorId: BOT,
			actions: [{ type: AutoModerationActionType.BlockMessage }],
			...rule,
		}));

		return {
			autoModerationRules: { fetch: jest.fn().mockResolvedValue(new Collection(docs.map((d) => [d.id, d]))) },
		} as unknown as Guild;
	}

	/** Discord answers in its own order, and a list that reshuffles between reads is unreadable. */
	it("sorts by name rather than trusting Discord's order", async () => {
		const rules = await listAutomodRules(guildHolding({ id: "2", name: "Zebra" }, { id: "1", name: "Alpha" }), BOT);

		expect(rules.map((rule) => rule.name)).toEqual(["Alpha", "Zebra"]);
	});

	it("is empty rather than throwing when the server has no rules", async () => {
		await expect(listAutomodRules(guildHolding(), BOT)).resolves.toEqual([]);
	});
});

describe("canManageAutomod", () => {
	it("is false when the bot has no member object yet", () => {
		expect(canManageAutomod({ members: { me: null } } as unknown as Guild)).toBe(false);
	});

	it("is false without Manage Server", () => {
		const guild = {
			members: { me: { permissions: { has: (flag: bigint) => flag !== PermissionFlagsBits.ManageGuild } } },
		} as unknown as Guild;

		expect(canManageAutomod(guild)).toBe(false);
	});

	it("is true with it", () => {
		expect(canManageAutomod(guildWith())).toBe(true);
	});
});
