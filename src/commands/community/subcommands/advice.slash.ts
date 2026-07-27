import { z } from "zod";
import { defineCommand } from "@core/command";
import { embed } from "@lib/embeds.util";
import { fetchJson } from "@lib/http.util";
import { reply } from "@lib/reply.util";

const adviceSchema = z.object({ slip: z.object({ id: z.number(), advice: z.string() }) });

export default defineCommand({
	name: "advice",
	description: "Gets a piece of random advice.",
	category: "community",
	cooldown: 5_000,

	async run(interaction) {
		await interaction.deferReply();
		const payload = await fetchJson("adviceslip", "https://api.adviceslip.com/advice", adviceSchema);

		await reply(interaction, {
			embeds: [
				embed({
					category: "community",
					title: "Advice",
					description: `> ${payload.slip.advice}`,
					footer: `Slip #${payload.slip.id}`,
				}),
			],
		});
	},
});
