import { ButtonStyle, ChannelType, PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { theme } from "../../../config/theme";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import {
	deleteVerifyConfig,
	getVerifyConfig,
	saveVerifyConfig,
} from "../../../database/repositories/verificationRepository";
import { button, row } from "../../../ui/components";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "verify",
	description: "Configures the verification system.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	botPermissions: [PermissionFlagsBits.ManageRoles],
	subcommands: [
		{
			name: "setup",
			description: "Post the verification panel.",
			options: [
				{ name: "role", description: "The role given once verified.", type: "role", required: true },
				{
					name: "channel",
					description: "Where the panel is posted.",
					type: "channel",
					required: true,
					channelTypes: [ChannelType.GuildText],
				},
				{ name: "content", description: "The panel message.", type: "string", maxLength: 1_000 },
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const role = ctx.options.getRole("role");
				const channel = ctx.options.getChannel("channel");

				if (!role) throw new UserFacingError("Pick a role to grant on verification.");
				if (!channel?.isTextBased() || !channel.isSendable()) throw new UserFacingError("Pick a text channel.");

				const me = guild.members.me;
				if (me && role.position >= me.roles.highest.position) {
					throw new UserFacingError("That role is higher than mine, so I could not assign it.");
				}

				const message = ctx.options.getString("content") ?? "Press the button below to verify yourself.";

				const posted = await channel.send({
					embeds: [
						embed({
							category: Category.Settings,
							title: `${theme.emoji.verify} Verification`,
							description: message,
							...(guild.iconURL() !== null ? { thumbnail: guild.iconURL()! } : {}),
						}),
					],
					components: [
						row(
							button({
								id: encodeId(Namespace.Verify, "start"),
								label: "Verify",
								emoji: theme.emoji.verify,
								style: ButtonStyle.Success,
							}),
						),
					],
				});

				await saveVerifyConfig(guild.id, { channelId: channel.id, roleId: role.id, messageId: posted.id });
				await ctx.reply({ embeds: [successEmbed(`Verification is set up in ${channel}.`)], ephemeral: true });
			},
		},
		{
			name: "disable",
			description: "Turn verification off.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await deleteVerifyConfig(guild.id);
				if (!removed) throw new UserFacingError("Verification is not set up here.");

				await ctx.reply({ embeds: [successEmbed("Verification has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the verification configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const config = await getVerifyConfig(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Verification",
							description: config
								? `Enabled in <#${config.channelId}>, granting <@&${config.roleId}>.\n**${config.verifiedIds.length}** member(s) verified.`
								: "Not configured.",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `setup`, `disable` or `status`.", ephemeral: true });
	},
});
