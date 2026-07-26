import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "ping",
	description: "Checks the bot's latency.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["latency", "pong"],

	async execute(ctx) {
		const sentAt = Date.now();
		await ctx.reply({ embeds: [embed({ category: Category.Info, description: "Pinging…" })] });
		const roundTrip = Date.now() - sentAt;

		await ctx.editReply({
			embeds: [
				embed({
					category: Category.Info,
					title: "Pong",
					fields: [
						{ name: "Gateway", value: `${Math.max(0, Math.round(ctx.client.ws.ping))}ms`, inline: true },
						{ name: "Round trip", value: `${roundTrip}ms`, inline: true },
					],
				}),
			],
		});
	},
});
