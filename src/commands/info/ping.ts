import { defineCommand } from "../../core/command";
import { embed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "ping",
	description: "Checks the bot's latency.",
	category: "info",
	aliases: ["latency"],

	async run(interaction, client) {
		const sentAt = Date.now();
		await reply(interaction, { embeds: [embed({ category: "info", description: "Pinging…" })] });
		const roundTrip = Date.now() - sentAt;

		await interaction.editReply({
			embeds: [
				embed({
					category: "info",
					title: "Pong",
					fields: [
						{ name: "Gateway", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
						{ name: "Round trip", value: `${roundTrip}ms`, inline: true },
					],
				}),
			],
		});
	},
});
