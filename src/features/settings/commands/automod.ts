import {
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	PermissionFlagsBits,
} from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { embed, successEmbed } from "../../../ui/embeds";

/**
 * The raw numeric enums the previous version passed (`eventType: 1`,
 * `triggerType: 4`, `presets: [1, 2, 3]`) are now the named discord.js enums.
 */
export default defineCommand({
	name: "automod",
	description: "Creates Discord AutoMod rules.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "flagged-words",
			description: "Block profanity, sexual content and slurs.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				await ctx.defer();

				const rule = await guild.autoModerationRules.create({
					name: "Blocked words",
					enabled: true,
					eventType: AutoModerationRuleEventType.MessageSend,
					triggerType: AutoModerationRuleTriggerType.KeywordPreset,
					triggerMetadata: {
						presets: [
							AutoModerationRuleKeywordPresetType.Profanity,
							AutoModerationRuleKeywordPresetType.SexualContent,
							AutoModerationRuleKeywordPresetType.Slurs,
						],
					},
					actions: [
						{
							type: AutoModerationActionType.BlockMessage,
							metadata: { customMessage: "That message was blocked by AutoMod." },
						},
					],
					reason: `Created by ${ctx.user.username}`,
				});

				await ctx.reply({ embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "spam",
			description: "Block spam messages.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				await ctx.defer();

				const rule = await guild.autoModerationRules.create({
					name: "Block spam",
					enabled: true,
					eventType: AutoModerationRuleEventType.MessageSend,
					triggerType: AutoModerationRuleTriggerType.Spam,
					actions: [
						{
							type: AutoModerationActionType.BlockMessage,
							metadata: { customMessage: "That message looked like spam." },
						},
					],
					reason: `Created by ${ctx.user.username}`,
				});

				await ctx.reply({ embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "mention-spam",
			description: "Limit how many members one message can mention.",
			options: [
				{
					name: "limit",
					description: "Maximum mentions per message.",
					type: "integer",
					required: true,
					minValue: 1,
					maxValue: 50,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				await ctx.defer();

				const rule = await guild.autoModerationRules.create({
					name: "Mention spam",
					enabled: true,
					eventType: AutoModerationRuleEventType.MessageSend,
					triggerType: AutoModerationRuleTriggerType.MentionSpam,
					triggerMetadata: { mentionTotalLimit: ctx.options.getInteger("limit", true) },
					actions: [
						{
							type: AutoModerationActionType.BlockMessage,
							metadata: { customMessage: "That message mentioned too many people." },
						},
					],
					reason: `Created by ${ctx.user.username}`,
				});

				await ctx.reply({ embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "keyword",
			description: "Block a specific word or phrase.",
			options: [{ name: "word", description: "The word or phrase to block.", type: "string", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const word = ctx.options.getString("word", true).trim();
				if (word.length === 0) throw new UserFacingError("Provide a word to block.");

				await ctx.defer();

				const rule = await guild.autoModerationRules.create({
					name: `Blocked keyword: ${word}`.slice(0, 100),
					enabled: true,
					eventType: AutoModerationRuleEventType.MessageSend,
					triggerType: AutoModerationRuleTriggerType.Keyword,
					triggerMetadata: { keywordFilter: [word] },
					actions: [
						{
							type: AutoModerationActionType.BlockMessage,
							metadata: { customMessage: "That message contained a blocked word." },
						},
					],
					reason: `Created by ${ctx.user.username}`,
				});

				await ctx.reply({ embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "list",
			description: "List the AutoMod rules in this server.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const rules = await guild.autoModerationRules.fetch();

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: `AutoMod rules (${rules.size})`,
							description:
								rules
									.map((rule) => `\`${rule.id}\` ${rule.name} \u2014 ${rule.enabled ? "enabled" : "disabled"}`)
									.join("\n") || "No rules configured.",
						}),
					],
				});
			},
		},
		{
			name: "delete",
			description: "Delete an AutoMod rule by id.",
			options: [{ name: "rule-id", description: "The rule id from `/automod list`.", type: "string", required: true }],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const ruleId = ctx.options.getString("rule-id", true).trim();

				const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
				if (!rule) throw new UserFacingError("No AutoMod rule with that id exists here.");

				await rule.delete(`Removed by ${ctx.user.username}`);
				await ctx.reply({ embeds: [successEmbed(`Deleted AutoMod rule **${rule.name}**.`)] });
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand from `/automod`.", ephemeral: true });
	},
});
