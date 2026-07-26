import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { addToBlacklist, listBlacklist, removeFromBlacklist } from "../../../database/repositories/blacklistRepository";
import { embed, successEmbed } from "../../../ui/embeds";
import { discordTime } from "../../../ui/format";

export default defineCommand({
	name: "blacklist",
	description: "Blocks users from using the bot.",
	category: Category.Owner,
	surfaces: ["slash"],
	ownerOnly: true,
	subcommands: [
		{
			name: "add",
			description: "Blacklist a user.",
			options: [
				{ name: "user", description: "Who to blacklist.", type: "user", required: true },
				{ name: "reason", description: "Why.", type: "string", greedy: true },
			],
			async execute(ctx) {
				const target = ctx.options.getUser("user", true);
				if (ctx.client.isOwner(target.id)) throw new UserFacingError("You cannot blacklist a bot owner.");

				await addToBlacklist(target.id, ctx.options.getString("reason") ?? "No reason provided");
				await ctx.reply({ embeds: [successEmbed(`${target} has been blacklisted.`)], ephemeral: true });
			},
		},
		{
			name: "remove",
			description: "Remove a user from the blacklist.",
			options: [{ name: "user", description: "Who to unblock.", type: "user", required: true }],
			async execute(ctx) {
				const target = ctx.options.getUser("user", true);
				const removed = await removeFromBlacklist(target.id);
				if (!removed) throw new UserFacingError("That user is not blacklisted.");

				await ctx.reply({ embeds: [successEmbed(`${target} has been removed from the blacklist.`)], ephemeral: true });
			},
		},
		{
			name: "list",
			description: "Show everyone on the blacklist.",
			async execute(ctx) {
				const entries = await listBlacklist(25);

				await ctx.reply({
					embeds: [
						embed({
							category: Category.Owner,
							title: `Blacklist (${entries.length})`,
							description:
								entries
									.map((entry) => `<@${entry.userId}> \u2014 ${entry.reason} (${discordTime(entry.createdAt, "R")})`)
									.join("\n") || "Nobody is blacklisted.",
						}),
					],
					ephemeral: true,
				});
			},
		},
	],

	async execute(ctx) {
		await ctx.reply({ content: "Pick a subcommand: `add`, `remove` or `list`.", ephemeral: true });
	},
});
