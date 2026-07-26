import { PermissionFlagsBits } from "discord.js";
import { LIMITS } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "clear",
	description: "Bulk deletes recent messages in this channel.",
	category: Category.Moderation,
	surfaces: ["slash", "prefix"],
	aliases: ["purge", "prune"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [PermissionFlagsBits.ManageMessages],
	options: [
		{
			name: "amount",
			description: "How many messages to delete (1-100).",
			type: "integer",
			required: true,
			minValue: LIMITS.bulkDeleteMin,
			maxValue: LIMITS.bulkDeleteMax,
		},
		{ name: "user", description: "Only delete messages from this user.", type: "user" },
	],

	async execute(ctx) {
		const channel = requireTextChannel(ctx);
		const amount = ctx.options.getInteger("amount", true);
		const target = ctx.options.getUser("user");

		if (amount < LIMITS.bulkDeleteMin || amount > LIMITS.bulkDeleteMax) {
			throw new UserFacingError(`Pick a number between ${LIMITS.bulkDeleteMin} and ${LIMITS.bulkDeleteMax}.`);
		}

		await ctx.defer(true);

		const fetched = await channel.messages.fetch({ limit: LIMITS.bulkDeleteMax });
		const candidates = [...fetched.values()]
			.filter((message) => (target ? message.author.id === target.id : true))
			.filter((message) => !message.pinned)
			.slice(0, amount);

		if (candidates.length === 0) throw new UserFacingError("There was nothing to delete.");

		// Discord refuses to bulk-delete anything older than 14 days.
		const deleted = await channel.bulkDelete(candidates, true);

		await ctx.reply({
			embeds: [
				successEmbed(
					`Deleted **${deleted.size}** message(s)${target ? ` from ${target}` : ""}.` +
						(deleted.size < candidates.length ? "\nMessages older than 14 days could not be removed." : ""),
				),
			],
			ephemeral: true,
		});
	},
});
