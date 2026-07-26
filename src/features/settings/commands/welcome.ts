import { ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { disableWelcome, getWelcome, setWelcome } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "welcome-system",
	description: "Greets new members when they join.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.SendMessages],
	subcommands: [
		{
			name: "set",
			description: "Configure the welcome message.",
			options: [
				{
					name: "channel",
					description: "Where to post the greeting.",
					type: "channel",
					required: true,
					channelTypes: [ChannelType.GuildText],
				},
				{
					name: "message",
					description: "The message. Use {user}, {server} and {count} as placeholders.",
					type: "string",
					required: true,
					maxLength: 1_500,
				},
				{ name: "embed", description: "Send the greeting as an embed.", type: "boolean" },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const channel = ctx.options.getChannel("channel");
				if (!channel?.isTextBased() || !channel.isSendable()) {
					throw new UserFacingError("Pick a text channel I can send messages in.");
				}

				await setWelcome(
					guild.id,
					channel.id,
					ctx.options.getString("message", true),
					ctx.options.getBoolean("embed") ?? false,
				);

				await ctx.reply({ embeds: [successEmbed(`New members will be greeted in ${channel}.`)] });
			},
		},
		{
			name: "remove",
			description: "Stop greeting new members.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await disableWelcome(guild.id);
				if (!removed) throw new UserFacingError("The welcome system is not set up here.");
				await ctx.reply({ embeds: [successEmbed("The welcome system has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the current welcome configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getWelcome(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Welcome system",
							description: settings ? `Enabled in <#${settings.channelId}>.\n\n> ${settings.message}` : "Disabled.",
							...(settings ? { fields: [{ name: "Embed mode", value: settings.isEmbed ? "On" : "Off" }] } : {}),
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `set`, `remove` or `status`.", ephemeral: true });
	},
});
