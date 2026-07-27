import { PermissionFlagsBits } from "discord.js";
import { TREASURE_DEFAULTS } from "@config/constants";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/settingsRepository";
import { embed, successEmbed } from "@lib/embeds.util";
import { formatDuration, formatNumber } from "@lib/format.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "treasure",
	description: "Configures random money drops in chat.",
	category: "economy",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "configure",
			description: "Set how treasure drops behave.",
			options: [
				{ name: "enabled", description: "Whether drops happen at all.", type: "boolean", required: true },
				{
					name: "min-messages",
					description: "Fewest messages between drops.",
					type: "integer",
					min: 5,
					max: 500,
				},
				{
					name: "max-messages",
					description: "Most messages between drops.",
					type: "integer",
					min: 5,
					max: 1000,
				},
				{ name: "min-amount", description: "Smallest drop.", type: "integer", min: 1, max: 100000 },
				{ name: "max-amount", description: "Largest drop.", type: "integer", min: 1, max: 100000 },
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const existing = await getTreasureConfig(guild.id);

				const minMessages =
					interaction.options.getInteger("min-messages") ?? existing?.minMessages ?? TREASURE_DEFAULTS.minMessages;
				const maxMessages =
					interaction.options.getInteger("max-messages") ?? existing?.maxMessages ?? TREASURE_DEFAULTS.maxMessages;
				const minAmount =
					interaction.options.getInteger("min-amount") ?? existing?.minAmount ?? TREASURE_DEFAULTS.minAmount;
				const maxAmount =
					interaction.options.getInteger("max-amount") ?? existing?.maxAmount ?? TREASURE_DEFAULTS.maxAmount;

				if (minMessages > maxMessages)
					throw new UserFacingError("The minimum message count cannot exceed the maximum.");
				if (minAmount > maxAmount) throw new UserFacingError("The minimum amount cannot exceed the maximum.");

				await saveTreasureConfig(guild.id, {
					isEnabled: interaction.options.getBoolean("enabled", true),
					minMessages,
					maxMessages,
					minAmount,
					maxAmount,
					cooldownMs: existing?.cooldownMs ?? TREASURE_DEFAULTS.cooldownMs,
					lastModifiedBy: interaction.user.id,
				});

				await reply(interaction, { embeds: [successEmbed("Treasure drop settings saved.")] });
			},
		},
		{
			name: "status",
			description: "Show the current treasure settings.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const config = await getTreasureConfig(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "economy",
							title: "Treasure drops",
							description: config
								? config.isEnabled
									? "Enabled."
									: "Configured but currently disabled."
								: "Not configured. Use `/treasure configure`.",
							...(config
								? {
										fields: [
											{
												name: "Messages between drops",
												value: `${config.minMessages}\u2013${config.maxMessages}`,
												inline: true,
											},
											{
												name: "Drop size",
												value: `${formatNumber(config.minAmount)}\u2013${formatNumber(config.maxAmount)}`,
												inline: true,
											},
											{ name: "Cooldown", value: formatDuration(config.cooldownMs), inline: true },
										],
									}
								: {}),
						}),
					],
				});
			},
		},
	],
});
