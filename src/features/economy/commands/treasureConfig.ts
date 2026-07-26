import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { TREASURE_DEFAULTS } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getTreasureConfig, saveTreasureConfig } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { formatDuration, formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "treasure",
	description: "Configures random money drops in chat.",
	category: Category.Economy,
	surfaces: ["slash"],
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
					minValue: 5,
					maxValue: 500,
				},
				{
					name: "max-messages",
					description: "Most messages between drops.",
					type: "integer",
					minValue: 5,
					maxValue: 1000,
				},
				{ name: "min-amount", description: "Smallest drop.", type: "integer", minValue: 1, maxValue: 100000 },
				{ name: "max-amount", description: "Largest drop.", type: "integer", minValue: 1, maxValue: 100000 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const existing = await getTreasureConfig(guild.id);

				const minMessages =
					ctx.options.getInteger("min-messages") ?? existing?.minMessages ?? TREASURE_DEFAULTS.minMessages;
				const maxMessages =
					ctx.options.getInteger("max-messages") ?? existing?.maxMessages ?? TREASURE_DEFAULTS.maxMessages;
				const minAmount = ctx.options.getInteger("min-amount") ?? existing?.minAmount ?? TREASURE_DEFAULTS.minAmount;
				const maxAmount = ctx.options.getInteger("max-amount") ?? existing?.maxAmount ?? TREASURE_DEFAULTS.maxAmount;

				if (minMessages > maxMessages)
					throw new UserFacingError("The minimum message count cannot exceed the maximum.");
				if (minAmount > maxAmount) throw new UserFacingError("The minimum amount cannot exceed the maximum.");

				await saveTreasureConfig(guild.id, {
					isEnabled: ctx.options.getBoolean("enabled", true),
					minMessages,
					maxMessages,
					minAmount,
					maxAmount,
					cooldownMs: existing?.cooldownMs ?? TREASURE_DEFAULTS.cooldownMs,
					lastModifiedBy: ctx.user.id,
				});

				await ctx.reply({ embeds: [successEmbed("Treasure drop settings saved.")] });
			},
		},
		{
			name: "status",
			description: "Show the current treasure settings.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const config = await getTreasureConfig(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Economy,
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

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `configure` or `status`.", ephemeral: true });
	},
});
