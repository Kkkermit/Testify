import { PermissionFlagsBits } from "discord.js";
import { DEFAULT_PREFIX } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getGuildSettings, setPrefix, setPrefixEnabled } from "../../../database/repositories/guildSettingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "prefix",
	description: "Manages the prefix command system for this server.",
	category: Category.Settings,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "show",
			description: "Show the current prefix.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getGuildSettings(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Prefix settings",
							fields: [
								{ name: "Prefix", value: `\`${settings.prefix}\``, inline: true },
								{ name: "Enabled", value: settings.isPrefixEnabled ? "Yes" : "No", inline: true },
							],
						}),
					],
				});
			},
		},
		{
			name: "change",
			description: "Set a new prefix.",
			options: [
				{
					name: "prefix",
					description: "The new prefix (1-5 characters).",
					type: "string",
					required: true,
					maxLength: 5,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const next = ctx.options.getString("prefix", true).trim();

				if (next.length === 0 || next.length > 5) throw new UserFacingError("The prefix must be 1-5 characters.");
				if (/\s/.test(next)) throw new UserFacingError("The prefix cannot contain spaces.");

				await setPrefix(guild.id, next);
				await ctx.reply({ embeds: [successEmbed(`The prefix is now \`${next}\`.`)] });
			},
		},
		{
			name: "toggle",
			description: "Turn the prefix system on or off.",
			options: [
				{ name: "enabled", description: "Whether prefix commands work here.", type: "boolean", required: true },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const enabled = ctx.options.getBoolean("enabled", true);

				await setPrefixEnabled(guild.id, enabled);
				await ctx.reply({
					embeds: [successEmbed(enabled ? "Prefix commands are now enabled." : "Prefix commands are now disabled.")],
				});
			},
		},
		{
			name: "reset",
			description: `Restore the default prefix (${DEFAULT_PREFIX}).`,
			async execute(ctx) {
				const guild = requireGuild(ctx);
				await setPrefix(guild.id, DEFAULT_PREFIX);
				await ctx.reply({ embeds: [successEmbed(`The prefix has been reset to \`${DEFAULT_PREFIX}\`.`)] });
			},
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const settings = await getGuildSettings(guild.id);
		await ctx.reply({
			embeds: [
				embed({
					category: Category.Settings,
					title: "Prefix settings",
					description: `The prefix here is \`${settings.prefix}\`. Use \`/prefix change\` to alter it.`,
				}),
			],
		});
	},
});
