import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { disableAntiLink, getAntiLink, setAntiLink } from "../../database/repositories/settingsRepository";
import { embed, successEmbed } from "../../lib/embeds";
import { humanisePermission } from "../../lib/format";
import { reply } from "../../lib/reply";

const BYPASS_CHOICES = [
	{ name: "Manage messages", value: "ManageMessages" },
	{ name: "Manage guild", value: "ManageGuild" },
	{ name: "Moderate members", value: "ModerateMembers" },
	{ name: "Administrator", value: "Administrator" },
];

export default defineCommand({
	name: "anti-link",
	description: "Deletes links posted by members without the bypass permission.",
	category: "settings",
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
			async run(interaction) {
				const guild = inGuild(interaction);
				const permission = interaction.options.getString("bypass-permission", true);

				if (!BYPASS_CHOICES.some((choice) => choice.value === permission)) {
					throw new UserFacingError("That is not one of the supported bypass permissions.");
				}

				await setAntiLink(guild.id, permission);
				await reply(interaction, {
					embeds: [
						successEmbed(`Anti-link is on. Members with \`${humanisePermission(permission)}\` can still post links.`),
					],
				});
			},
		},
		{
			name: "disable",
			description: "Turn the anti-link system off.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await disableAntiLink(guild.id);
				if (!removed) throw new UserFacingError("Anti-link is not enabled here.");
				await reply(interaction, { embeds: [successEmbed("Anti-link has been turned off.")] });
			},
		},
		{
			name: "status",
			description: "Show the current anti-link configuration.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const settings = await getAntiLink(guild.id);

				await reply(interaction, {
					embeds: [
						embed({
							category: "settings",
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
});
