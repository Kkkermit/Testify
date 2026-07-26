import { ButtonStyle, MessageFlags, PermissionFlagsBits } from "discord.js";
import { customId } from "../../core/button";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { deleteAccount } from "../../database/repositories/economyRepository";
import { button, row } from "../../lib/components";
import { successEmbed, warningEmbed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "reset",
	description: "Resets economy or level data.",
	category: "economy",
	guildOnly: true,
	permissions: [PermissionFlagsBits.Administrator],
	subcommands: [
		{
			name: "user",
			description: "Wipe one member's economy account.",
			options: [{ name: "user", description: "Whose account to wipe.", type: "user", required: true }],
			async run(interaction) {
				const guild = inGuild(interaction);
				const target = interaction.options.getUser("user", true);

				const deleted = await deleteAccount(guild.id, target.id);
				if (!deleted) throw new UserFacingError(`${target.username} does not have an account here.`);

				await reply(interaction, { embeds: [successEmbed(`Wiped ${target}'s economy account.`)] });
			},
		},
		{
			name: "server",
			description: "Wipe every economy account in this server.",
			async run(interaction) {
				await reply(interaction, {
					embeds: [
						warningEmbed("This will delete **every** economy account in this server. There is no undo. Confirm below."),
					],
					components: [
						row(
							button({
								id: customId("reset", "economy-yes", interaction.user.id),
								label: "Delete everything",
								style: ButtonStyle.Danger,
							}),
							button({
								id: customId("reset", "economy-no", interaction.user.id),
								label: "Cancel",
								style: ButtonStyle.Secondary,
							}),
						),
					],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "levels",
			description: "Wipe every level in this server.",
			async run(interaction) {
				await reply(interaction, {
					embeds: [warningEmbed("This will reset **every** member's level in this server. Confirm below.")],
					components: [
						row(
							button({
								id: customId("reset", "levels-yes", interaction.user.id),
								label: "Reset all levels",
								style: ButtonStyle.Danger,
							}),
							button({
								id: customId("reset", "levels-no", interaction.user.id),
								label: "Cancel",
								style: ButtonStyle.Secondary,
							}),
						),
					],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
