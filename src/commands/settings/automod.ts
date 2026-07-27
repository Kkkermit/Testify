import {
	AutoModerationActionType,
	AutoModerationRuleEventType,
	AutoModerationRuleKeywordPresetType,
	AutoModerationRuleTriggerType,
	PermissionFlagsBits,
} from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { embed, successEmbed } from "@lib/embeds";
import { reply } from "@lib/reply";

/**
 * The raw numeric enums the previous version passed (`eventType: 1`,
 * `triggerType: 4`, `presets: [1, 2, 3]`) are now the named discord.js enums.
 */
export default defineCommand({
	name: "automod",
	description: "Creates Discord AutoMod rules.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "flagged-words",
			description: "Block profanity, sexual content and slurs.",
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

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
					reason: `Created by ${interaction.user.username}`,
				});

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "spam",
			description: "Block spam messages.",
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

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
					reason: `Created by ${interaction.user.username}`,
				});

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
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
					min: 1,
					max: 50,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

				const rule = await guild.autoModerationRules.create({
					name: "Mention spam",
					enabled: true,
					eventType: AutoModerationRuleEventType.MessageSend,
					triggerType: AutoModerationRuleTriggerType.MentionSpam,
					triggerMetadata: { mentionTotalLimit: interaction.options.getInteger("limit", true) },
					actions: [
						{
							type: AutoModerationActionType.BlockMessage,
							metadata: { customMessage: "That message mentioned too many people." },
						},
					],
					reason: `Created by ${interaction.user.username}`,
				});

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "keyword",
			description: "Block a specific word or phrase.",
			options: [{ name: "word", description: "The word or phrase to block.", type: "string", required: true }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const word = interaction.options.getString("word", true).trim();
				if (word.length === 0) throw new UserFacingError("Provide a word to block.");

				await interaction.deferReply();

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
					reason: `Created by ${interaction.user.username}`,
				});

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "list",
			description: "List the AutoMod rules in this server.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const rules = await guild.autoModerationRules.fetch();

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const ruleId = interaction.options.getString("rule-id", true).trim();

				const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
				if (!rule) throw new UserFacingError("No AutoMod rule with that id exists here.");

				await rule.delete(`Removed by ${interaction.user.username}`);
				await reply(interaction, { embeds: [successEmbed(`Deleted AutoMod rule **${rule.name}**.`)] });
			},
		},
	],
});
