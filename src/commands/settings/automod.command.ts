import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createAutomodRule, listAutomodRules } from "@lib/automodActions.util";
import { embed, successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";
import { AUTOMOD_LIMITS } from "@testify/shared";

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

				const rule = await createAutomodRule(
					guild,
					{ preset: "flagged-words" },
					`Created by ${interaction.user.username}`,
				);
				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "spam",
			description: "Block spam messages.",
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

				const rule = await createAutomodRule(guild, { preset: "spam" }, `Created by ${interaction.user.username}`);
				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "mention-spam",
			description: "Block messages that mention too many people.",
			options: [
				{
					name: "limit",
					description: "How many mentions to allow in one message.",
					type: "integer",
					required: true,
					min: AUTOMOD_LIMITS.minMentions,
					max: AUTOMOD_LIMITS.maxMentions,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

				const limit = interaction.options.getInteger("limit", true);
				const rule = await createAutomodRule(
					guild,
					{ preset: "mention-spam", limit },
					`Created by ${interaction.user.username}`,
				);

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "keyword",
			description: "Block a word or phrase.",
			options: [{ name: "word", description: "The word or phrase to block.", type: "string", required: true }],
			async run(interaction) {
				const guild = inGuild(interaction);
				await interaction.deferReply();

				const word = interaction.options.getString("word", true).trim();
				if (word === "") throw new UserFacingError("Give a word or phrase to block.");

				const rule = await createAutomodRule(
					guild,
					{ preset: "keyword", word },
					`Created by ${interaction.user.username}`,
				);

				await reply(interaction, { embeds: [successEmbed(`AutoMod rule **${rule.name}** created.`)] });
			},
		},
		{
			name: "list",
			description: "List the AutoMod rules in this server.",
			async run(interaction, client) {
				const guild = inGuild(interaction);
				const rules = await listAutomodRules(guild, client.user?.id ?? "");

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
							title: `AutoMod rules (${String(rules.length)})`,
							description:
								rules.map((rule) => `${rule.enabled ? "🟢" : "⚪"} **${rule.name}** — ${rule.trigger}`).join("\n") ||
								"No rules configured.",
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
