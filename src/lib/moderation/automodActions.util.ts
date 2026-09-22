import {
	AutoModerationActionType,
	type AutoModerationRule,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	type Guild,
	PermissionFlagsBits,
} from "discord.js";
import { type AutomodAction, type AutomodCreate, type AutomodPreset, type AutomodRuleSummary } from "@testify/shared";

/** Discord's AutoMod: nothing here is stored by the bot, so Discord is the only source of truth. */

const TRIGGER_PRESET = new Map<AutoModerationRuleTriggerType, AutomodPreset>([
	[AutoModerationRuleTriggerType.KeywordPreset, "flagged-words"],
	[AutoModerationRuleTriggerType.Spam, "spam"],
	[AutoModerationRuleTriggerType.MentionSpam, "mention-spam"],
	[AutoModerationRuleTriggerType.Keyword, "keyword"],
]);

const TRIGGER_LABEL = new Map<AutoModerationRuleTriggerType, string>([
	[AutoModerationRuleTriggerType.KeywordPreset, "Discord's word lists"],
	[AutoModerationRuleTriggerType.Spam, "Spam"],
	[AutoModerationRuleTriggerType.MentionSpam, "Mention spam"],
	[AutoModerationRuleTriggerType.Keyword, "A word you chose"],
	[AutoModerationRuleTriggerType.MemberProfile, "A member's profile"],
]);

const ACTION: Record<number, AutomodAction> = {
	[AutoModerationActionType.BlockMessage]: "block",
	[AutoModerationActionType.SendAlertMessage]: "alert",
	[AutoModerationActionType.Timeout]: "timeout",
};

export function canManageAutomod(guild: Guild): boolean {
	return guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild) === true;
}

export function toRuleSummary(rule: AutoModerationRule, botId: string): AutomodRuleSummary {
	return {
		id: rule.id,
		name: rule.name,
		enabled: rule.enabled,
		preset: TRIGGER_PRESET.get(rule.triggerType) ?? null,
		trigger: TRIGGER_LABEL.get(rule.triggerType) ?? "Something else",
		actions: [...new Set(rule.actions.map((action) => ACTION[action.type] ?? "other"))],
		fromTestify: rule.creatorId === botId,
	};
}

export async function listAutomodRules(guild: Guild, botId: string): Promise<AutomodRuleSummary[]> {
	const rules = await guild.autoModerationRules.fetch();

	return [...rules.values()].map((rule) => toRuleSummary(rule, botId)).sort((a, b) => a.name.localeCompare(b.name));
}

/** The one place a rule is built, so the command and the dashboard cannot create two different things. */
export async function createAutomodRule(
	guild: Guild,
	input: AutomodCreate,
	reason: string,
): Promise<AutoModerationRule> {
	const block = {
		type: AutoModerationActionType.BlockMessage,
		metadata: { customMessage: "That message was blocked by AutoMod." },
	} as const;
	const base = { enabled: true, eventType: AutoModerationRuleEventType.MessageSend, actions: [block], reason };

	switch (input.preset) {
		case "flagged-words":
			return guild.autoModerationRules.create({
				...base,
				name: "Blocked words",
				triggerType: AutoModerationRuleTriggerType.KeywordPreset,
				triggerMetadata: {
					presets: [
						AutoModerationRuleKeywordPresetType.Profanity,
						AutoModerationRuleKeywordPresetType.SexualContent,
						AutoModerationRuleKeywordPresetType.Slurs,
					],
				},
			});
		case "spam":
			return guild.autoModerationRules.create({
				...base,
				name: "Block spam",
				triggerType: AutoModerationRuleTriggerType.Spam,
			});
		case "mention-spam":
			return guild.autoModerationRules.create({
				...base,
				name: "Mention spam",
				triggerType: AutoModerationRuleTriggerType.MentionSpam,
				triggerMetadata: { mentionTotalLimit: input.limit },
			});
		case "keyword":
			return guild.autoModerationRules.create({
				...base,
				name: `Blocked: ${input.word}`,
				triggerType: AutoModerationRuleTriggerType.Keyword,
				triggerMetadata: { keywordFilter: [input.word] },
			});
	}
}
