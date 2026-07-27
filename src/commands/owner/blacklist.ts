import { MessageFlags } from "discord.js";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { addToBlacklist, listBlacklist, removeFromBlacklist } from "@database/repositories/blacklistRepository";
import { embed, successEmbed } from "@lib/embeds";
import { discordTime } from "@lib/format";
import { reply } from "@lib/reply";

export default defineCommand({
	name: "blacklist",
	description: "Blocks users from using the bot.",
	category: "owner",
	ownerOnly: true,
	subcommands: [
		{
			name: "add",
			description: "Blacklist a user.",
			options: [
				{ name: "user", description: "Who to blacklist.", type: "user", required: true },
				{ name: "reason", description: "Why.", type: "string" },
			],
			async run(interaction, client) {
				const target = interaction.options.getUser("user", true);
				if (client.isOwner(target.id)) throw new UserFacingError("You cannot blacklist a bot owner.");

				await addToBlacklist(target.id, interaction.options.getString("reason") ?? "No reason provided");
				await reply(interaction, {
					embeds: [successEmbed(`${target} has been blacklisted.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "remove",
			description: "Remove a user from the blacklist.",
			options: [{ name: "user", description: "Who to unblock.", type: "user", required: true }],
			async run(interaction) {
				const target = interaction.options.getUser("user", true);
				const removed = await removeFromBlacklist(target.id);
				if (!removed) throw new UserFacingError("That user is not blacklisted.");

				await reply(interaction, {
					embeds: [successEmbed(`${target} has been removed from the blacklist.`)],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
		{
			name: "list",
			description: "Show everyone on the blacklist.",
			async run(interaction) {
				const entries = await listBlacklist(25);

				await reply(interaction, {
					embeds: [
						embed({
							category: "owner",
							title: `Blacklist (${entries.length})`,
							description:
								entries
									.map((entry) => `<@${entry.userId}> \u2014 ${entry.reason} (${discordTime(entry.createdAt, "R")})`)
									.join("\n") || "Nobody is blacklisted.",
						}),
					],
					flags: MessageFlags.Ephemeral,
				});
			},
		},
	],
});
