import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { requireTextChannel } from "../../../core/guards";
import { successEmbed } from "../../../ui/embeds";

const MAX_FLUSH = 100;

export default defineCommand({
	name: "flush-logs",
	description: "Deletes the bot's own recent messages in this channel.",
	category: Category.Owner,
	surfaces: ["slash", "prefix"],
	aliases: ["flush"],
	guildOnly: true,
	ownerOnly: true,
	options: [
		{ name: "amount", description: "How many to scan (1-100).", type: "integer", minValue: 1, maxValue: MAX_FLUSH },
	],

	async execute(ctx) {
		const channel = requireTextChannel(ctx);
		const limit = ctx.options.getInteger("amount") ?? MAX_FLUSH;

		await ctx.defer(true);

		const fetched = await channel.messages.fetch({ limit: MAX_FLUSH });
		const mine = [...fetched.values()].filter((message) => message.author.id === ctx.client.user?.id).slice(0, limit);

		if (mine.length === 0) throw new UserFacingError("I have no recent messages to remove here.");

		const deleted = await channel.bulkDelete(mine, true);
		await ctx.reply({ embeds: [successEmbed(`Removed **${deleted.size}** of my messages.`)], ephemeral: true });
	},
});
