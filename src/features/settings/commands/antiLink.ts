import { PermissionFlagsBits } from "discord.js";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { disableAntiLink, getAntiLink, setAntiLink } from "../../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { humanisePermission } from "../../../ui/format";

const BYPASS_CHOICES = [
	{ name: "Manage messages", value: "ManageMessages" },
	{ name: "Manage guild", value: "ManageGuild" },
	{ name: "Moderate members", value: "ModerateMembers" },
	{ name: "Administrator", value: "Administrator" },
];

export default defineCommand({
	name: "anti-link",
	description: "Deletes links posted by members without the bypass permission.",
	category: Category.Settings,
	surfaces: ["slash"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageMessages],
	subcommands: [
		{
			name: "enable",
			description: "Turn the anti-link system on.",
			options: [
				{
					name: "bypass-permission",
					description: "Members with this permission may post links.",
					type: "string",
					required: true,
					choices: BYPASS_CHOICES,
				},
			],
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const permission = ctx.options.getString("bypass-permission", true);

				if (!BYPASS_CHOICES.some((choice) => choice.value === permission)) {
					throw new UserFacingError("That is not one of the supported bypass permissions.");
				}

				await setAntiLink(guild.id, permission);
				await ctx.reply({
					embeds: [
						successEmbed(`Anti-link is on. Members with \`${humanisePermission(permission)}\` can still post links.`),
					],
				});
			},
		},
		{
			name: "disable",
			description: "Turn the anti-link system off.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const removed = await disableAntiLink(guild.id);
				if (!removed) throw new UserFacingError("Anti-link is not enabled here.");
				await ctx.reply({ embeds: [successEmbed("Anti-link has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the current anti-link configuration.",
			async execute(ctx) {
				const guild = requireGuild(ctx);
				const settings = await getAntiLink(guild.id);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Settings,
							title: "Anti-link",
							description: settings
								? `Enabled. Bypass permission: \`${humanisePermission(settings.bypassPermission)}\`.`
								: "Disabled.",
						}),
					],
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `enable`, `disable` or `status`.", ephemeral: true });
	},
});
