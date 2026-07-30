import { PermissionFlagsBits } from "discord.js";
import { type CommandInput, defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deleteVerifyConfig, getVerifyConfig } from "@database/repositories/verificationRepository";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";
import { normaliseVerify, verifyPanel } from "@lib/verifyPanel.util";

/**
 * One panel instead of three subcommands.
 *
 * `/verify setup <role> <channel> <content>` posted the public panel as a side
 * effect of configuring, so changing the wording meant running setup again and
 * leaving the old panel behind. The panel separates the two: configure freely,
 * then post once.
 */
async function openPanel(interaction: CommandInput): Promise<void> {
	const guild = inGuild(interaction);
	const config = normaliseVerify(await getVerifyConfig(guild.id));

	const role = config.roleId === null ? undefined : guild.roles.cache.get(config.roleId);
	const me = guild.members.me;

	await reply(
		interaction,
		verifyPanel(
			{
				config,
				roleTooHigh: role !== undefined && me !== null && (role.managed || role.position >= me.roles.highest.position),
			},
			interaction.user.id,
		),
	);
}

export default defineCommand({
	name: "verify",
	description: "Configures the verification system.",
	category: "settings",
	aliases: ["verification"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	botPermissions: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.SendMessages],
	subcommands: [
		{
			name: "setup",
			description: "Open the verification panel.",
			async run(interaction) {
				await openPanel(interaction);
			},
		},
		{
			name: "edit",
			description: "Change the verification configuration.",
			async run(interaction) {
				await openPanel(interaction);
			},
		},
		{
			name: "disable",
			description: "Turn verification off.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await deleteVerifyConfig(guild.id);
				if (!removed) throw new UserFacingError("Verification is not set up here.");

				await reply(interaction, { embeds: [successEmbed("Verification has been turned off.")] });
			},
		},
	],

	async run(interaction) {
		await openPanel(interaction);
	},
});
